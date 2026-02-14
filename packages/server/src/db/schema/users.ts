import { pgTable, uuid, varchar, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['admin', 'user']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  emailVerifiedAt: timestamp('email_verified_at'),
  emailVerificationToken: varchar('email_verification_token', { length: 64 }),
  emailVerificationExpiresAt: timestamp('email_verification_expires_at'),
  refreshToken: varchar('refresh_token', { length: 512 }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  passwordResetToken: varchar('password_reset_token', { length: 64 }),
  passwordResetExpiresAt: timestamp('password_reset_expires_at'),
  deletionToken: varchar('deletion_token', { length: 64 }),
  deletionTokenExpiresAt: timestamp('deletion_token_expires_at'),
  magicLinkToken: varchar('magic_link_token', { length: 64 }),
  magicLinkTokenExpiresAt: timestamp('magic_link_token_expires_at'),
  role: userRoleEnum('role').notNull().default('user'),
  deactivatedAt: timestamp('deactivated_at'),
  deletionScheduledAt: timestamp('deletion_scheduled_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
