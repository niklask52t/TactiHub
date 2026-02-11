import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import { eq, and, isNull, lt } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { users, registrationTokens, settings } from '../db/schema/index.js';
import type { TokenPayload, UserRole } from '@strathub/shared';
import { ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY_SECONDS } from '@strathub/shared';
import type Redis from 'ioredis';

export function generateAccessToken(userId: string, role: UserRole): string {
  return jwt.sign({ userId, role } satisfies TokenPayload, process.env.JWT_SECRET!, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

export function generateRefreshToken(userId: string, role: UserRole): string {
  return jwt.sign({ userId, role } satisfies TokenPayload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: `${REFRESH_TOKEN_EXPIRY_SECONDS}s`,
  });
}

export async function storeRefreshToken(redis: Redis, userId: string, refreshToken: string) {
  await redis.set(`refresh:${userId}`, refreshToken, 'EX', REFRESH_TOKEN_EXPIRY_SECONDS);
}

export async function revokeRefreshToken(redis: Redis, userId: string) {
  await redis.del(`refresh:${userId}`);
}

export async function verifyRefreshToken(redis: Redis, userId: string, token: string): Promise<boolean> {
  const stored = await redis.get(`refresh:${userId}`);
  return stored === token;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function isRegistrationEnabled(): Promise<boolean> {
  const result = await db.select().from(settings).where(eq(settings.key, 'registration_enabled'));
  if (result.length === 0) return true;
  return result[0].value === 'true';
}

export async function validateRegistrationToken(token: string) {
  const result = await db.select().from(registrationTokens).where(
    and(
      eq(registrationTokens.token, token),
      isNull(registrationTokens.usedBy),
    )
  );

  if (result.length === 0) return null;

  const regToken = result[0];
  if (new Date(regToken.expiresAt) < new Date()) return null;

  return regToken;
}

export async function markTokenUsed(tokenId: string, userId: string) {
  await db.update(registrationTokens).set({
    usedBy: userId,
    usedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(registrationTokens.id, tokenId));
}

export function generateEmailToken(): string {
  return nanoid(32);
}

export async function storeEmailVerificationToken(redis: Redis, userId: string, token: string) {
  await redis.set(`email-verify:${token}`, userId, 'EX', 86400); // 24 hours
}

export async function getEmailVerificationUserId(redis: Redis, token: string): Promise<string | null> {
  return redis.get(`email-verify:${token}`);
}

export async function storePasswordResetToken(redis: Redis, email: string, token: string) {
  await redis.set(`password-reset:${token}`, email, 'EX', 3600); // 1 hour
}

export async function getPasswordResetEmail(redis: Redis, token: string): Promise<string | null> {
  return redis.get(`password-reset:${token}`);
}

export async function cleanupUnverifiedUsers() {
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  await db.delete(users).where(
    and(
      isNull(users.emailVerifiedAt),
      lt(users.createdAt, oneMonthAgo),
    )
  );
}
