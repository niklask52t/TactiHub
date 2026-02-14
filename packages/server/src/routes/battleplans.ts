import type { FastifyInstance } from 'fastify';
import { eq, and, desc, sql, count } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/connection.js';
import { battleplans, battleplanFloors, draws, operatorSlots, maps, mapFloors, votes, users, operators, games } from '../db/schema/index.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { MAX_OPERATOR_SLOTS } from '@tactihub/shared';

async function getBattleplanWithDetails(id: string, userId?: string) {
  const [plan] = await db.select().from(battleplans).where(eq(battleplans.id, id));
  if (!plan) return null;

  const [owner] = await db.select({
    id: users.id,
    username: users.username,
  }).from(users).where(eq(users.id, plan.ownerId));

  const [game] = await db.select({ id: games.id, slug: games.slug, name: games.name })
    .from(games).where(eq(games.id, plan.gameId));

  const [map] = plan.mapId
    ? await db.select({ id: maps.id, name: maps.name, slug: maps.slug })
        .from(maps).where(eq(maps.id, plan.mapId))
    : [null];

  const floors = await db.select().from(battleplanFloors).where(eq(battleplanFloors.battleplanId, id));

  const floorsWithDraws = await Promise.all(floors.map(async (floor) => {
    const [mapFloor] = await db.select().from(mapFloors).where(eq(mapFloors.id, floor.mapFloorId));
    const floorDraws = await db.select().from(draws)
      .where(and(eq(draws.battleplanFloorId, floor.id), eq(draws.isDeleted, false)));
    return { ...floor, mapFloor, draws: floorDraws };
  }));

  const slots = await db.select().from(operatorSlots)
    .where(eq(operatorSlots.battleplanId, id))
    .orderBy(operatorSlots.side, operatorSlots.slotNumber);

  const slotsWithOperators = await Promise.all(slots.map(async (slot) => {
    let operator = null;
    if (slot.operatorId) {
      const [op] = await db.select().from(operators).where(eq(operators.id, slot.operatorId));
      operator = op || null;
    }
    return { ...slot, operator };
  }));

  // Vote count
  const voteResult = await db.select({ total: sql<number>`COALESCE(SUM(${votes.value}), 0)` })
    .from(votes).where(eq(votes.battleplanId, id));
  const voteCount = Number(voteResult[0]?.total || 0);

  // User's vote
  let userVote: number | null = null;
  if (userId) {
    const [v] = await db.select().from(votes).where(
      and(eq(votes.battleplanId, id), eq(votes.userId, userId))
    );
    userVote = v?.value ?? null;
  }

  return {
    ...plan,
    owner,
    game,
    map: map || null,
    floors: floorsWithDraws,
    operatorSlots: slotsWithOperators,
    voteCount,
    userVote,
  };
}

export default async function battleplansRoutes(fastify: FastifyInstance) {
  // GET /api/battleplans - Public battleplans
  fastify.get('/', { preHandler: [optionalAuth] }, async (request) => {
    const { page = '1', pageSize = '20', gameId, tags: tagsParam } = request.query as Record<string, string>;
    const p = Math.max(1, parseInt(page));
    const ps = Math.min(100, Math.max(1, parseInt(pageSize)));

    const conditions = [eq(battleplans.isPublic, true)];
    if (gameId) conditions.push(eq(battleplans.gameId, gameId));
    if (tagsParam) {
      const tagList = tagsParam.split(',').map(t => t.trim()).filter(Boolean);
      if (tagList.length > 0) {
        conditions.push(sql`${battleplans.tags} @> ARRAY[${sql.join(tagList.map(t => sql`${t}`), sql`, `)}]::text[]`);
      }
    }

    const whereClause = and(...conditions);

    const [{ total }] = await db.select({ total: count() }).from(battleplans).where(whereClause);

    const result = await db.select().from(battleplans)
      .where(whereClause)
      .orderBy(desc(battleplans.createdAt))
      .limit(ps)
      .offset((p - 1) * ps);

    return {
      data: result,
      total,
      page: p,
      pageSize: ps,
      totalPages: Math.ceil(total / ps),
    };
  });

  // GET /api/battleplans/mine
  fastify.get('/mine', { preHandler: [requireAuth] }, async (request) => {
    const result = await db.select().from(battleplans)
      .where(eq(battleplans.ownerId, request.user!.userId))
      .orderBy(desc(battleplans.updatedAt));
    return { data: result };
  });

  // POST /api/battleplans
  fastify.post('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = z.object({
      gameId: z.string().uuid(),
      mapId: z.string().uuid(),
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      tags: z.array(z.string().max(30)).max(10).optional(),
    }).parse(request.body);

    const [plan] = await db.insert(battleplans).values({
      ownerId: request.user!.userId,
      gameId: body.gameId,
      mapId: body.mapId,
      name: body.name,
      description: body.description,
      tags: body.tags || [],
    }).returning();

    // Auto-create floors from map
    const floors = await db.select().from(mapFloors).where(eq(mapFloors.mapId, body.mapId)).orderBy(mapFloors.floorNumber);
    for (const floor of floors) {
      await db.insert(battleplanFloors).values({
        battleplanId: plan.id,
        mapFloorId: floor.id,
      });
    }

    // Auto-create defender operator slots
    for (let i = 1; i <= MAX_OPERATOR_SLOTS; i++) {
      await db.insert(operatorSlots).values({
        battleplanId: plan.id,
        slotNumber: i,
        side: 'defender',
      });
    }

    const fullPlan = await getBattleplanWithDetails(plan.id, request.user!.userId);
    return reply.status(201).send({ data: fullPlan });
  });

  // GET /api/battleplans/:id
  fastify.get('/:id', { preHandler: [optionalAuth] }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const plan = await getBattleplanWithDetails(id, request.user?.userId);
    if (!plan) return reply.status(404).send({ error: 'Not Found', message: 'Battleplan not found', statusCode: 404 });

    // Check access
    if (!plan.isPublic && plan.ownerId !== request.user?.userId && request.user?.role !== 'admin') {
      return reply.status(404).send({ error: 'Not Found', message: 'Battleplan not found', statusCode: 404 });
    }

    return { data: plan };
  });

  // PUT /api/battleplans/:id
  fastify.put('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z.object({
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      notes: z.string().optional(),
      tags: z.array(z.string().max(30)).max(10).optional(),
      isPublic: z.boolean().optional(),
      isSaved: z.boolean().optional(),
    }).parse(request.body);

    const [existing] = await db.select().from(battleplans).where(eq(battleplans.id, id));
    if (!existing) return reply.status(404).send({ error: 'Not Found', message: 'Battleplan not found', statusCode: 404 });
    if (existing.ownerId !== request.user!.userId && request.user!.role !== 'admin') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Not authorized', statusCode: 403 });
    }

    const [plan] = await db.update(battleplans).set({ ...body, updatedAt: new Date() }).where(eq(battleplans.id, id)).returning();
    return { data: plan };
  });

  // DELETE /api/battleplans/:id
  fastify.delete('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const [existing] = await db.select().from(battleplans).where(eq(battleplans.id, id));
    if (!existing) return reply.status(404).send({ error: 'Not Found', message: 'Battleplan not found', statusCode: 404 });
    if (existing.ownerId !== request.user!.userId && request.user!.role !== 'admin') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Not authorized', statusCode: 403 });
    }

    await db.delete(battleplans).where(eq(battleplans.id, id));
    return { message: 'Battleplan deleted' };
  });

  // POST /api/battleplans/:id/copy
  fastify.post('/:id/copy', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const source = await getBattleplanWithDetails(id, request.user!.userId);
    if (!source) return reply.status(404).send({ error: 'Not Found', message: 'Battleplan not found', statusCode: 404 });

    // Create copy
    const [newPlan] = await db.insert(battleplans).values({
      ownerId: request.user!.userId,
      gameId: source.gameId,
      mapId: source.mapId,
      name: `${source.name} (Copy)`,
      description: source.description,
      notes: source.notes,
      tags: source.tags || [],
    }).returning();

    // Copy floors and draws
    if (source.floors) {
      for (const floor of source.floors) {
        const [newFloor] = await db.insert(battleplanFloors).values({
          battleplanId: newPlan.id,
          mapFloorId: floor.mapFloorId,
        }).returning();

        if (floor.draws) {
          for (const draw of floor.draws) {
            await db.insert(draws).values({
              battleplanFloorId: newFloor.id,
              userId: request.user!.userId,
              type: draw.type,
              originX: draw.originX,
              originY: draw.originY,
              destinationX: draw.destinationX,
              destinationY: draw.destinationY,
              data: draw.data,
            });
          }
        }
      }
    }

    // Copy operator slots (including side)
    if (source.operatorSlots) {
      for (const slot of source.operatorSlots) {
        await db.insert(operatorSlots).values({
          battleplanId: newPlan.id,
          slotNumber: slot.slotNumber,
          operatorId: slot.operatorId,
          side: slot.side,
        });
      }
    }

    const fullPlan = await getBattleplanWithDetails(newPlan.id, request.user!.userId);
    return reply.status(201).send({ data: fullPlan });
  });

  // POST /api/battleplans/:id/attacker-lineup
  fastify.post('/:id/attacker-lineup', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const [existing] = await db.select().from(battleplans).where(eq(battleplans.id, id));
    if (!existing) return reply.status(404).send({ error: 'Not Found', message: 'Battleplan not found', statusCode: 404 });
    if (existing.ownerId !== request.user!.userId && request.user!.role !== 'admin') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Not authorized', statusCode: 403 });
    }

    // Check if attacker slots already exist
    const existingAttackerSlots = await db.select().from(operatorSlots)
      .where(and(eq(operatorSlots.battleplanId, id), eq(operatorSlots.side, 'attacker')));
    if (existingAttackerSlots.length > 0) {
      return reply.status(409).send({ error: 'Conflict', message: 'Attacker lineup already exists', statusCode: 409 });
    }

    for (let i = 1; i <= MAX_OPERATOR_SLOTS; i++) {
      await db.insert(operatorSlots).values({
        battleplanId: id,
        slotNumber: i,
        side: 'attacker',
      });
    }

    const fullPlan = await getBattleplanWithDetails(id, request.user!.userId);
    return reply.status(201).send({ data: fullPlan });
  });

  // DELETE /api/battleplans/:id/attacker-lineup
  fastify.delete('/:id/attacker-lineup', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const [existing] = await db.select().from(battleplans).where(eq(battleplans.id, id));
    if (!existing) return reply.status(404).send({ error: 'Not Found', message: 'Battleplan not found', statusCode: 404 });
    if (existing.ownerId !== request.user!.userId && request.user!.role !== 'admin') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Not authorized', statusCode: 403 });
    }

    await db.delete(operatorSlots).where(
      and(eq(operatorSlots.battleplanId, id), eq(operatorSlots.side, 'attacker'))
    );

    return { message: 'Attacker lineup removed' };
  });

  // POST /api/battleplans/:id/vote
  fastify.post('/:id/vote', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const { value } = z.object({ value: z.number().int().min(-1).max(1) }).parse(request.body);

    const [existing] = await db.select().from(battleplans).where(eq(battleplans.id, id));
    if (!existing) return reply.status(404).send({ error: 'Not Found', message: 'Battleplan not found', statusCode: 404 });

    if (value === 0) {
      // Remove vote
      await db.delete(votes).where(
        and(eq(votes.battleplanId, id), eq(votes.userId, request.user!.userId))
      );
    } else {
      // Upsert vote
      await db.insert(votes).values({
        battleplanId: id,
        userId: request.user!.userId,
        value,
      }).onConflictDoUpdate({
        target: [votes.userId, votes.battleplanId],
        set: { value, updatedAt: new Date() },
      });
    }

    // Return updated vote count
    const voteResult = await db.select({ total: sql<number>`COALESCE(SUM(${votes.value}), 0)` })
      .from(votes).where(eq(votes.battleplanId, id));

    return { data: { voteCount: Number(voteResult[0]?.total || 0), userVote: value || null } };
  });
}
