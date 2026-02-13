import { pgTable, uuid, varchar, text, boolean, timestamp, integer, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { games } from './games.js';
import { maps, mapFloors } from './maps.js';
import { operators } from './operators.js';

export const drawTypeEnum = pgEnum('draw_type', ['path', 'line', 'rectangle', 'text', 'icon']);
export const slotSideEnum = pgEnum('slot_side', ['defender', 'attacker']);

export const battleplans = pgTable('battleplans', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  gameId: uuid('game_id').notNull().references(() => games.id, { onDelete: 'cascade' }),
  mapId: uuid('map_id').notNull().references(() => maps.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  notes: text('notes'),
  tags: text('tags').array().default([]),
  isPublic: boolean('is_public').notNull().default(false),
  isSaved: boolean('is_saved').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const battleplanFloors = pgTable('battleplan_floors', {
  id: uuid('id').primaryKey().defaultRandom(),
  battleplanId: uuid('battleplan_id').notNull().references(() => battleplans.id, { onDelete: 'cascade' }),
  mapFloorId: uuid('map_floor_id').notNull().references(() => mapFloors.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const draws = pgTable('draws', {
  id: uuid('id').primaryKey().defaultRandom(),
  battleplanFloorId: uuid('battleplan_floor_id').notNull().references(() => battleplanFloors.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  type: drawTypeEnum('type').notNull(),
  originX: integer('origin_x').notNull(),
  originY: integer('origin_y').notNull(),
  destinationX: integer('destination_x'),
  destinationY: integer('destination_y'),
  data: jsonb('data').notNull().default({}),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const operatorSlots = pgTable('operator_slots', {
  id: uuid('id').primaryKey().defaultRandom(),
  battleplanId: uuid('battleplan_id').notNull().references(() => battleplans.id, { onDelete: 'cascade' }),
  slotNumber: integer('slot_number').notNull(),
  operatorId: uuid('operator_id').references(() => operators.id, { onDelete: 'set null' }),
  side: slotSideEnum('side').notNull().default('defender'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
