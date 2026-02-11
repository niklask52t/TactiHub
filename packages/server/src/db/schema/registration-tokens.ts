import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const registrationTokens = pgTable('registration_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  usedBy: uuid('used_by').references(() => users.id, { onDelete: 'set null' }),
  usedAt: timestamp('used_at'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
