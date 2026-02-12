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
  storeDeletionToken,
  getDeletionTokenUserId,
  storeMagicLinkToken,
  getMagicLinkUserId,
  verifyRecaptcha,
} from '../services/auth.service.js';
import { sendVerificationEmail, sendPasswordResetEmail, sendDeletionConfirmationEmail, sendAccountDeactivatedEmail, sendMagicLinkEmail } from '../services/email.service.js';
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

    // Send verification email
    const emailToken = generateEmailToken();
    await storeEmailVerificationToken(fastify.redis, user.id, emailToken);
    await sendVerificationEmail(user.email, emailToken);

    return reply.status(201).send({
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      message: 'Registration successful. Please check your email to verify your account.',
    });
  });

  // POST /api/auth/login
  fastify.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);

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
    await storeRefreshToken(fastify.redis, user.id, refreshToken);

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
    await revokeRefreshToken(fastify.redis, request.user!.userId);
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

    const valid = await verifyRefreshToken(fastify.redis, payload.userId, refreshToken);
    if (!valid) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Refresh token revoked', statusCode: 401 });
    }

    // Get fresh user data
    const [user] = await db.select().from(users).where(eq(users.id, payload.userId));
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'User not found', statusCode: 401 });
    }

    if (user.deactivatedAt) {
      await revokeRefreshToken(fastify.redis, user.id);
      reply.clearCookie('refreshToken', { path: '/api/auth/refresh' });
      return reply.status(403).send({ error: 'Forbidden', message: 'Account deactivated', statusCode: 403 });
    }

    const accessToken = generateAccessToken(user.id, user.role);
    const newRefreshToken = generateRefreshToken(user.id, user.role);
    await storeRefreshToken(fastify.redis, user.id, newRefreshToken);

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
    await storePasswordResetToken(fastify.redis, email, token);
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
    await storeMagicLinkToken(fastify.redis, user.id, token);
    await sendMagicLinkEmail(user.email, token);

    return { message: successMessage };
  });

  // GET /api/auth/magic-login
  fastify.get('/magic-login', async (request, reply) => {
    const { token } = z.object({ token: z.string() }).parse(request.query);

    const userId = await getMagicLinkUserId(fastify.redis, token);
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
    await fastify.redis.del(`magic-link:${token}`);

    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id, user.role);
    await storeRefreshToken(fastify.redis, user.id, refreshToken);

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

    const email = await getPasswordResetEmail(fastify.redis, token);
    if (!email) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Invalid or expired reset token', statusCode: 400 });
    }

    const passwordHash = await hashPassword(password);
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.email, email));

    // Remove the used token
    await fastify.redis.del(`password-reset:${token}`);

    return { message: 'Password reset successfully' };
  });

  // GET /api/auth/verify-email
  fastify.get('/verify-email', async (request, reply) => {
    const { token } = z.object({ token: z.string() }).parse(request.query);

    const userId = await getEmailVerificationUserId(fastify.redis, token);
    if (!userId) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Invalid or expired verification token', statusCode: 400 });
    }

    await db.update(users).set({
      emailVerifiedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(users.id, userId));

    // Remove the used token
    await fastify.redis.del(`email-verify:${token}`);

    return { message: 'Email verified successfully. You can now log in.' };
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

    if (username !== user.username) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Username does not match', statusCode: 400 });
    }

    if (user.deactivatedAt) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Account is already deactivated', statusCode: 400 });
    }

    const token = generateEmailToken();
    await storeDeletionToken(fastify.redis, user.id, token);
    await sendDeletionConfirmationEmail(user.email, user.username, token);

    return { message: 'A confirmation email has been sent. Please check your inbox.' };
  });

  // GET /api/auth/confirm-deletion
  fastify.get('/confirm-deletion', async (request, reply) => {
    const { token } = z.object({ token: z.string() }).parse(request.query);

    const userId = await getDeletionTokenUserId(fastify.redis, token);
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
    await revokeRefreshToken(fastify.redis, userId);

    // Consume the deletion token
    await fastify.redis.del(`deletion:${token}`);

    // Send deactivation notification
    try {
      await sendAccountDeactivatedEmail(user.email, user.username);
    } catch { /* best-effort */ }

    return { message: 'Your account has been deactivated. It will be permanently deleted after 30 days.' };
  });
}
