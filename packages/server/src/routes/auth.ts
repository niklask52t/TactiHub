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
} from '../services/auth.service.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email.service.js';
import jwt from 'jsonwebtoken';
import type { TokenPayload } from '@strathub/shared';
import { REFRESH_TOKEN_EXPIRY_SECONDS } from '@strathub/shared';

const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8),
  token: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export default async function authRoutes(fastify: FastifyInstance) {
  // POST /api/auth/register
  fastify.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);

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

    const [user] = await db.select().from(users).where(eq(users.email, body.email));
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid email or password', statusCode: 401 });
    }

    const validPassword = await verifyPassword(body.password, user.passwordHash);
    if (!validPassword) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid email or password', statusCode: 401 });
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
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    };
  });
}
