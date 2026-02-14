import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import { eq, and, isNull, isNotNull, lt } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { users, registrationTokens, settings } from '../db/schema/index.js';
import type { TokenPayload, UserRole } from '@tactihub/shared';
import { ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY_SECONDS, DELETION_GRACE_PERIOD_DAYS } from '@tactihub/shared';

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

// --- Refresh tokens (DB) ---

export async function storeRefreshToken(userId: string, refreshToken: string) {
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_SECONDS * 1000);
  await db.update(users).set({
    refreshToken,
    refreshTokenExpiresAt: expiresAt,
    updatedAt: new Date(),
  }).where(eq(users.id, userId));
}

export async function revokeRefreshToken(userId: string) {
  await db.update(users).set({
    refreshToken: null,
    refreshTokenExpiresAt: null,
    updatedAt: new Date(),
  }).where(eq(users.id, userId));
}

export async function verifyRefreshToken(userId: string, token: string): Promise<boolean> {
  const [user] = await db.select({
    refreshToken: users.refreshToken,
    refreshTokenExpiresAt: users.refreshTokenExpiresAt,
  }).from(users).where(eq(users.id, userId));
  if (!user || !user.refreshToken) return false;
  if (user.refreshTokenExpiresAt && user.refreshTokenExpiresAt < new Date()) return false;
  return user.refreshToken === token;
}

// --- Password reset tokens (DB) ---

export async function storePasswordResetToken(email: string, token: string) {
  const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour
  await db.update(users).set({
    passwordResetToken: token,
    passwordResetExpiresAt: expiresAt,
    updatedAt: new Date(),
  }).where(eq(users.email, email));
}

export async function getPasswordResetEmail(token: string): Promise<string | null> {
  const [user] = await db.select({
    email: users.email,
    passwordResetExpiresAt: users.passwordResetExpiresAt,
  }).from(users).where(eq(users.passwordResetToken, token));
  if (!user) return null;
  if (user.passwordResetExpiresAt && user.passwordResetExpiresAt < new Date()) return null;
  return user.email;
}

export async function clearPasswordResetToken(email: string) {
  await db.update(users).set({
    passwordResetToken: null,
    passwordResetExpiresAt: null,
    updatedAt: new Date(),
  }).where(eq(users.email, email));
}

// --- Deletion tokens (DB) ---

export async function storeDeletionToken(userId: string, token: string) {
  const expiresAt = new Date(Date.now() + 86400 * 1000); // 24 hours
  await db.update(users).set({
    deletionToken: token,
    deletionTokenExpiresAt: expiresAt,
    updatedAt: new Date(),
  }).where(eq(users.id, userId));
}

export async function getDeletionTokenUserId(token: string): Promise<string | null> {
  const [user] = await db.select({
    id: users.id,
    deletionTokenExpiresAt: users.deletionTokenExpiresAt,
  }).from(users).where(eq(users.deletionToken, token));
  if (!user) return null;
  if (user.deletionTokenExpiresAt && user.deletionTokenExpiresAt < new Date()) return null;
  return user.id;
}

export async function clearDeletionToken(userId: string) {
  await db.update(users).set({
    deletionToken: null,
    deletionTokenExpiresAt: null,
    updatedAt: new Date(),
  }).where(eq(users.id, userId));
}

// --- Magic link tokens (DB) ---

const MAGIC_LINK_EXPIRY_SECONDS = 900; // 15 minutes

export async function storeMagicLinkToken(userId: string, token: string) {
  const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_SECONDS * 1000);
  await db.update(users).set({
    magicLinkToken: token,
    magicLinkTokenExpiresAt: expiresAt,
    updatedAt: new Date(),
  }).where(eq(users.id, userId));
}

export async function getMagicLinkUserId(token: string): Promise<string | null> {
  const [user] = await db.select({
    id: users.id,
    magicLinkTokenExpiresAt: users.magicLinkTokenExpiresAt,
  }).from(users).where(eq(users.magicLinkToken, token));
  if (!user) return null;
  if (user.magicLinkTokenExpiresAt && user.magicLinkTokenExpiresAt < new Date()) return null;
  return user.id;
}

export async function clearMagicLinkToken(userId: string) {
  await db.update(users).set({
    magicLinkToken: null,
    magicLinkTokenExpiresAt: null,
    updatedAt: new Date(),
  }).where(eq(users.id, userId));
}

// --- Email verification tokens (DB, already migrated) ---

export async function storeEmailVerificationToken(userId: string, token: string) {
  const expiresAt = new Date(Date.now() + 86400 * 1000); // 24 hours
  await db.update(users).set({
    emailVerificationToken: token,
    emailVerificationExpiresAt: expiresAt,
    updatedAt: new Date(),
  }).where(eq(users.id, userId));
}

export async function getEmailVerificationUserId(token: string): Promise<string | null> {
  const [user] = await db.select({ id: users.id, emailVerificationExpiresAt: users.emailVerificationExpiresAt })
    .from(users)
    .where(eq(users.emailVerificationToken, token));
  if (!user) return null;
  if (user.emailVerificationExpiresAt && user.emailVerificationExpiresAt < new Date()) return null;
  return user.id;
}

export async function clearEmailVerificationToken(userId: string) {
  await db.update(users).set({
    emailVerificationToken: null,
    emailVerificationExpiresAt: null,
    updatedAt: new Date(),
  }).where(eq(users.id, userId));
}

// --- Helpers ---

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
