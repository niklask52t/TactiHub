import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import { eq, and, isNull, isNotNull, lt } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { users, registrationTokens, settings } from '../db/schema/index.js';
import type { TokenPayload, UserRole } from '@tactihub/shared';
import { ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY_SECONDS, DELETION_GRACE_PERIOD_DAYS } from '@tactihub/shared';
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

export async function storeDeletionToken(redis: Redis, userId: string, token: string) {
  await redis.set(`deletion:${token}`, userId, 'EX', 86400); // 24 hours
}

export async function getDeletionTokenUserId(redis: Redis, token: string): Promise<string | null> {
  return redis.get(`deletion:${token}`);
}

const MAGIC_LINK_EXPIRY_SECONDS = 900; // 15 minutes

export async function storeMagicLinkToken(redis: Redis, userId: string, token: string) {
  await redis.set(`magic-link:${token}`, userId, 'EX', MAGIC_LINK_EXPIRY_SECONDS);
}

export async function getMagicLinkUserId(redis: Redis, token: string): Promise<string | null> {
  return redis.get(`magic-link:${token}`);
}

export async function cleanupDeactivatedUsers(): Promise<{ id: string; email: string }[]> {
  const now = new Date();

  const deactivatedUsers = await db.select({ id: users.id, email: users.email })
    .from(users)
    .where(
      and(
        isNotNull(users.deactivatedAt),
        isNotNull(users.deletionScheduledAt),
        lt(users.deletionScheduledAt, now),
      )
    );

  for (const user of deactivatedUsers) {
    await db.delete(users).where(eq(users.id, user.id));
  }

  return deactivatedUsers;
}

export async function verifyRecaptcha(token: string): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return true; // Skip if not configured

  const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}`,
  });
  const data = await res.json() as { success: boolean };
  return data.success === true;
}
