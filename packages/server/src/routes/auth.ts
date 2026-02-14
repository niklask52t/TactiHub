import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/connection.js';
import { users } from '../db/schema/index.js';
import { requireAuth } from '../middleware/auth.js';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  storeRefreshToken,
  revokeRefreshToken,
  verifyRefreshToken,
  isRegistrationEnabled,
  validateRegistrationToken,
  markTokenUsed,
  generateEmailToken,
  storeEmailVerificationToken,
  getEmailVerificationUserId,
  storePasswordResetToken,
  getPasswordResetEmail,
  clearPasswordResetToken,
  storeDeletionToken,
  getDeletionTokenUserId,
  clearDeletionToken,
  storeMagicLinkToken,
  getMagicLinkUserId,
  clearMagicLinkToken,
  storeEmailChangeToken,
  getEmailChangeData,
  clearEmailChangeToken,
  verifyRecaptcha,
} from '../services/auth.service.js';
import { sendVerificationEmail, sendPasswordResetEmail, sendDeletionConfirmationEmail, sendAccountDeactivatedEmail, sendMagicLinkEmail, sendEmailChangeVerification } from '../services/email.service.js';
import { DELETION_GRACE_PERIOD_DAYS } from '@tactihub/shared';
import jwt from 'jsonwebtoken';
import type { TokenPayload } from '@tactihub/shared';
import { REFRESH_TOKEN_EXPIRY_SECONDS } from '@tactihub/shared';

const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8),
  token: z.string().optional(),
  captchaToken: z.string().optional(),
});

const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string(),
  captchaToken: z.string().optional(),
});

export default async function authRoutes(fastify: FastifyInstance) {
  // GET /api/auth/registration-status (public)
  fastify.get('/registration-status', async () => {
    const enabled = await isRegistrationEnabled();
    return { data: { registrationEnabled: enabled } };
  });

  // GET /api/auth/recaptcha-key (public)
  fastify.get('/recaptcha-key', async () => {
    return { data: { siteKey: process.env.RECAPTCHA_SITE_KEY || null } };
  });

  // POST /api/auth/register
  fastify.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);

    // Verify reCAPTCHA (skip if not configured)
    if (process.env.RECAPTCHA_SECRET_KEY) {
      if (!body.captchaToken) {
        return reply.status(400).send({ error: 'Bad Request', message: 'CAPTCHA verification required', statusCode: 400 });
      }
      const captchaValid = await verifyRecaptcha(body.captchaToken);
      if (!captchaValid) {
        return reply.status(400).send({ error: 'Bad Request', message: 'CAPTCHA verification failed', statusCode: 400 });
      }
    }

    // Check if registration is enabled
    const regEnabled = await isRegistrationEnabled();
    if (!regEnabled) {
      if (!body.token) {
        return reply.status(403).send({ error: 'Forbidden', message: 'Registration is disabled. A registration token is required.', statusCode: 403 });
      }
      const regToken = await validateRegistrationToken(body.token);
      if (!regToken) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Invalid or expired registration token', statusCode: 400 });
      }
    }

    // Check if user already exists
    const existing = await db.select().from(users).where(eq(users.email, body.email));
    if (existing.length > 0) {
      return reply.status(409).send({ error: 'Conflict', message: 'Email already registered', statusCode: 409 });
    }

    const existingUsername = await db.select().from(users).where(eq(users.username, body.username));
    if (existingUsername.length > 0) {
      return reply.status(409).send({ error: 'Conflict', message: 'Username already taken', statusCode: 409 });
    }

    const passwordHash = await hashPassword(body.password);

    const [user] = await db.insert(users).values({
      username: body.username,
      email: body.email,
      passwordHash,
    }).returning();

    // Mark registration token as used if provided
    if (body.token) {
      const regToken = await validateRegistrationToken(body.token);
      if (regToken) {
        await markTokenUsed(regToken.id, user.id);
      }
    }

    // Send verification email (best-effort — don't fail registration if SMTP is down)
    const emailToken = generateEmailToken();
    await storeEmailVerificationToken(user.id, emailToken);
    let emailSent = true;
    try {
      await sendVerificationEmail(user.email, emailToken);
    } catch {
      emailSent = false;
    }

    return reply.status(201).send({
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      message: emailSent
        ? 'Registration successful. Please check your email to verify your account.'
        : 'Registration successful. Verification email could not be sent — please ask an admin to verify your account or try resending later.',
    });
  });

  // POST /api/auth/login
  fastify.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);

    // Verify reCAPTCHA (skip if not configured)
    if (process.env.RECAPTCHA_SECRET_KEY) {
      if (!body.captchaToken) {
        return reply.status(400).send({ error: 'Bad Request', message: 'CAPTCHA verification required', statusCode: 400 });
      }
      const captchaValid = await verifyRecaptcha(body.captchaToken);
      if (!captchaValid) {
        return reply.status(400).send({ error: 'Bad Request', message: 'CAPTCHA verification failed', statusCode: 400 });
      }
    }

    // Support login by email or username
    const isEmail = body.identifier.includes('@');
    const [user] = await db.select().from(users).where(
      isEmail ? eq(users.email, body.identifier) : eq(users.username, body.identifier)
    );
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid credentials', statusCode: 401 });
    }

    if (user.deactivatedAt) {
      return reply.status(403).send({ error: 'Forbidden', message: 'This account has been deactivated. Contact an administrator to reactivate it.', statusCode: 403 });
    }

    const validPassword = await verifyPassword(body.password, user.passwordHash);
    if (!validPassword) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid credentials', statusCode: 401 });
    }

    if (!user.emailVerifiedAt) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Please verify your email before logging in', statusCode: 403 });
    }

    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id, user.role);
    await storeRefreshToken(user.id, refreshToken);

    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth/refresh',
      maxAge: REFRESH_TOKEN_EXPIRY_SECONDS,
    });

    return {
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
          role: user.role,
          deactivatedAt: null,
          deletionScheduledAt: null,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
        accessToken,
      },
    };
  });

  // POST /api/auth/logout
  fastify.post('/logout', { preHandler: [requireAuth] }, async (request, reply) => {
    await revokeRefreshToken(request.user!.userId);
    reply.clearCookie('refreshToken', { path: '/api/auth/refresh' });
    return { message: 'Logged out successfully' };
  });

  // POST /api/auth/refresh
  fastify.post('/refresh', async (request, reply) => {
    const refreshToken = request.cookies.refreshToken;
    if (!refreshToken) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'No refresh token', statusCode: 401 });
    }

    let payload: TokenPayload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as TokenPayload;
    } catch {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid refresh token', statusCode: 401 });
    }

    const valid = await verifyRefreshToken(payload.userId, refreshToken);
    if (!valid) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Refresh token revoked', statusCode: 401 });
    }

    // Get fresh user data
    const [user] = await db.select().from(users).where(eq(users.id, payload.userId));
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'User not found', statusCode: 401 });
    }

    if (user.deactivatedAt) {
      await revokeRefreshToken(user.id);
      reply.clearCookie('refreshToken', { path: '/api/auth/refresh' });
      return reply.status(403).send({ error: 'Forbidden', message: 'Account deactivated', statusCode: 403 });
    }

    const accessToken = generateAccessToken(user.id, user.role);
    const newRefreshToken = generateRefreshToken(user.id, user.role);
    await storeRefreshToken(user.id, newRefreshToken);

    reply.setCookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth/refresh',
      maxAge: REFRESH_TOKEN_EXPIRY_SECONDS,
    });

    return {
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
          role: user.role,
          deactivatedAt: null,
          deletionScheduledAt: null,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
        accessToken,
      },
    };
  });

  // POST /api/auth/forgot-password
  fastify.post('/forgot-password', async (request, reply) => {
    const { email } = z.object({ email: z.string().email() }).parse(request.body);

    const [user] = await db.select().from(users).where(eq(users.email, email));
    // Always return success to prevent email enumeration
    if (!user) {
      return { message: 'If an account with that email exists, a password reset link has been sent.' };
    }

    const token = generateEmailToken();
    await storePasswordResetToken(email, token);
    await sendPasswordResetEmail(email, token);

    return { message: 'If an account with that email exists, a password reset link has been sent.' };
  });

  // POST /api/auth/request-magic-link
  fastify.post('/request-magic-link', async (request, reply) => {
    const { identifier } = z.object({ identifier: z.string().min(1) }).parse(request.body);

    // Always return success to prevent email/username enumeration
    const successMessage = 'If an account with that identifier exists, a magic login link has been sent.';

    const isEmail = identifier.includes('@');
    const [user] = await db.select().from(users).where(
      isEmail ? eq(users.email, identifier) : eq(users.username, identifier)
    );

    if (!user || user.deactivatedAt || !user.emailVerifiedAt) {
      return { message: successMessage };
    }

    const token = generateEmailToken();
    await storeMagicLinkToken(user.id, token);
    await sendMagicLinkEmail(user.email, token);

    return { message: successMessage };
  });

  // GET /api/auth/magic-login
  fastify.get('/magic-login', async (request, reply) => {
    const { token } = z.object({ token: z.string() }).parse(request.query);

    const userId = await getMagicLinkUserId(token);
    if (!userId) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Invalid or expired magic link', statusCode: 400 });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return reply.status(400).send({ error: 'Bad Request', message: 'User not found', statusCode: 400 });
    }

    if (user.deactivatedAt) {
      return reply.status(403).send({ error: 'Forbidden', message: 'This account has been deactivated. Contact an administrator to reactivate it.', statusCode: 403 });
    }

    if (!user.emailVerifiedAt) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Please verify your email before logging in', statusCode: 403 });
    }

    // Consume the token (single-use)
    await clearMagicLinkToken(userId);

    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id, user.role);
    await storeRefreshToken(user.id, refreshToken);

    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth/refresh',
      maxAge: REFRESH_TOKEN_EXPIRY_SECONDS,
    });

    return {
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
          role: user.role,
          deactivatedAt: null,
          deletionScheduledAt: null,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
        accessToken,
      },
    };
  });

  // POST /api/auth/reset-password
  fastify.post('/reset-password', async (request, reply) => {
    const { token, password } = z.object({
      token: z.string(),
      password: z.string().min(8),
    }).parse(request.body);

    const email = await getPasswordResetEmail(token);
    if (!email) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Invalid or expired reset token', statusCode: 400 });
    }

    const passwordHash = await hashPassword(password);
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.email, email));

    // Remove the used token
    await clearPasswordResetToken(email);

    return { message: 'Password reset successfully' };
  });

  // GET /api/auth/verify-email
  fastify.get('/verify-email', async (request, reply) => {
    const { token } = z.object({ token: z.string() }).parse(request.query);

    const userId = await getEmailVerificationUserId(token);
    if (!userId) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Invalid or expired verification token', statusCode: 400 });
    }

    // Mark as verified and clear the used token in one operation
    await db.update(users).set({
      emailVerifiedAt: new Date(),
      emailVerificationToken: null,
      emailVerificationExpiresAt: null,
      updatedAt: new Date(),
    }).where(eq(users.id, userId));

    return { message: 'Email verified successfully. You can now log in.' };
  });

  // POST /api/auth/resend-verification
  fastify.post('/resend-verification', async (request, reply) => {
    const { email } = z.object({ email: z.string().email() }).parse(request.body);

    // Always return success to prevent email enumeration
    const successMessage = 'If an unverified account with that email exists, a new verification link has been sent.';

    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user || user.emailVerifiedAt) {
      return { message: successMessage };
    }

    const emailToken = generateEmailToken();
    await storeEmailVerificationToken(user.id, emailToken);
    await sendVerificationEmail(user.email, emailToken);

    return { message: successMessage };
  });

  // POST /api/auth/request-email-change
  fastify.post('/request-email-change', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = z.object({
      currentEmail: z.string().email(),
      newEmail: z.string().email(),
      password: z.string().min(1),
    }).parse(request.body);

    const [user] = await db.select().from(users).where(eq(users.id, request.user!.userId));
    if (!user) {
      return reply.status(404).send({ error: 'Not Found', message: 'User not found', statusCode: 404 });
    }

    // Verify current email matches
    if (user.email !== body.currentEmail) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Current email does not match', statusCode: 400 });
    }

    // Verify password
    const validPassword = await verifyPassword(body.password, user.passwordHash);
    if (!validPassword) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Password is incorrect', statusCode: 401 });
    }

    // Check that new email is different
    if (user.email === body.newEmail) {
      return reply.status(400).send({ error: 'Bad Request', message: 'New email is the same as the current email', statusCode: 400 });
    }

    // Check that new email is not already taken
    const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, body.newEmail));
    if (existingUser) {
      return reply.status(409).send({ error: 'Conflict', message: 'This email address is already in use', statusCode: 409 });
    }

    // Generate token, store pending email change, send verification to new email
    const token = generateEmailToken();
    await storeEmailChangeToken(user.id, body.newEmail, token);
    await sendEmailChangeVerification(body.newEmail, token);

    return { message: 'A verification email has been sent to your new email address. Please click the link to confirm the change.' };
  });

  // GET /api/auth/confirm-email-change
  fastify.get('/confirm-email-change', async (request, reply) => {
    const { token } = z.object({ token: z.string() }).parse(request.query);

    const data = await getEmailChangeData(token);
    if (!data) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Invalid or expired email change token', statusCode: 400 });
    }

    // Check that the new email is still not taken
    const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, data.newEmail));
    if (existingUser) {
      await clearEmailChangeToken(data.userId);
      return reply.status(409).send({ error: 'Conflict', message: 'This email address is already in use', statusCode: 409 });
    }

    // Apply the email change
    await db.update(users).set({
      email: data.newEmail,
      pendingEmail: null,
      pendingEmailToken: null,
      pendingEmailTokenExpiresAt: null,
      updatedAt: new Date(),
    }).where(eq(users.id, data.userId));

    return { message: 'Email address changed successfully. Please log in again with your new email.' };
  });

  // POST /api/auth/change-credentials
  fastify.post('/change-credentials', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = z.object({
      currentPassword: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(8),
    }).parse(request.body);

    const [user] = await db.select().from(users).where(eq(users.id, request.user!.userId));
    if (!user) {
      return reply.status(404).send({ error: 'Not Found', message: 'User not found', statusCode: 404 });
    }

    const validPassword = await verifyPassword(body.currentPassword, user.passwordHash);
    if (!validPassword) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Current password is incorrect', statusCode: 401 });
    }

    const passwordHash = await hashPassword(body.password);
    const [updated] = await db.update(users).set({
      email: body.email,
      passwordHash,
      emailVerifiedAt: new Date(), // Skip verification for admin credential change
      updatedAt: new Date(),
    }).where(eq(users.id, user.id)).returning();

    return {
      data: {
        id: updated.id,
        username: updated.username,
        email: updated.email,
        emailVerifiedAt: updated.emailVerifiedAt?.toISOString() ?? null,
        role: updated.role,
        deactivatedAt: updated.deactivatedAt?.toISOString() ?? null,
        deletionScheduledAt: updated.deletionScheduledAt?.toISOString() ?? null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    };
  });

  // GET /api/auth/me
  fastify.get('/me', { preHandler: [requireAuth] }, async (request) => {
    const [user] = await db.select().from(users).where(eq(users.id, request.user!.userId));
    if (!user) {
      throw { statusCode: 404, message: 'User not found' };
    }

    return {
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
        role: user.role,
        deactivatedAt: user.deactivatedAt?.toISOString() ?? null,
        deletionScheduledAt: user.deletionScheduledAt?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    };
  });

  // POST /api/auth/request-deletion
  fastify.post('/request-deletion', { preHandler: [requireAuth] }, async (request, reply) => {
    const { username } = z.object({ username: z.string() }).parse(request.body);

    const [user] = await db.select().from(users).where(eq(users.id, request.user!.userId));
    if (!user) {
      return reply.status(404).send({ error: 'Not Found', message: 'User not found', statusCode: 404 });
    }

    if (user.role === 'admin') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Admin accounts cannot be deleted', statusCode: 403 });
    }

    if (username !== user.username) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Username does not match', statusCode: 400 });
    }

    if (user.deactivatedAt) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Account is already deactivated', statusCode: 400 });
    }

    const token = generateEmailToken();
    await storeDeletionToken(user.id, token);
    await sendDeletionConfirmationEmail(user.email, user.username, token);

    return { message: 'A confirmation email has been sent. Please check your inbox.' };
  });

  // GET /api/auth/confirm-deletion
  fastify.get('/confirm-deletion', async (request, reply) => {
    const { token } = z.object({ token: z.string() }).parse(request.query);

    const userId = await getDeletionTokenUserId(token);
    if (!userId) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Invalid or expired deletion token', statusCode: 400 });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return reply.status(404).send({ error: 'Not Found', message: 'User not found', statusCode: 404 });
    }

    if (user.deactivatedAt) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Account is already deactivated', statusCode: 400 });
    }

    const now = new Date();
    const deletionDate = new Date(now.getTime() + DELETION_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

    await db.update(users).set({
      deactivatedAt: now,
      deletionScheduledAt: deletionDate,
      updatedAt: now,
    }).where(eq(users.id, userId));

    // Revoke refresh token to force logout
    await revokeRefreshToken(userId);

    // Consume the deletion token
    await clearDeletionToken(userId);

    // Send deactivation notification
    try {
      await sendAccountDeactivatedEmail(user.email, user.username);
    } catch { /* best-effort */ }

    return { message: 'Your account has been deactivated. It will be permanently deleted after 30 days.' };
  });
}
