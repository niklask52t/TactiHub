import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { db } from '../db/connection.js';
import { rooms, battleplans } from '../db/schema/index.js';
import { requireAuth } from '../middleware/auth.js';

export default async function roomsRoutes(fastify: FastifyInstance) {
  // POST /api/rooms
  fastify.post('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = z.object({
      battleplanId: z.string().uuid().optional(),
    }).parse(request.body);

    const [room] = await db.insert(rooms).values({
      ownerId: request.user!.userId,
      battleplanId: body.battleplanId,
      connectionString: nanoid(12),
    }).returning();

    return reply.status(201).send({ data: room });
  });

  // GET /api/rooms/:connString
  fastify.get('/:connString', { preHandler: [requireAuth] }, async (request, reply) => {
    const { connString } = z.object({ connString: z.string() }).parse(request.params);
    const [room] = await db.select().from(rooms).where(eq(rooms.connectionString, connString));
    if (!room) return reply.status(404).send({ error: 'Not Found', message: 'Room not found', statusCode: 404 });

    return { data: room };
  });

  // PUT /api/rooms/:connString/battleplan
  fastify.put('/:connString/battleplan', { preHandler: [requireAuth] }, async (request, reply) => {
    const { connString } = z.object({ connString: z.string() }).parse(request.params);
    const { battleplanId } = z.object({ battleplanId: z.string().uuid().nullable() }).parse(request.body);

    const [room] = await db.select().from(rooms).where(eq(rooms.connectionString, connString));
    if (!room) return reply.status(404).send({ error: 'Not Found', message: 'Room not found', statusCode: 404 });

    if (room.ownerId !== request.user!.userId) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Only room owner can change battleplan', statusCode: 403 });
    }

    const [updated] = await db.update(rooms).set({ battleplanId, updatedAt: new Date() })
      .where(eq(rooms.connectionString, connString)).returning();

    return { data: updated };
  });

  // DELETE /api/rooms/:connString
  fastify.delete('/:connString', { preHandler: [requireAuth] }, async (request, reply) => {
    const { connString } = z.object({ connString: z.string() }).parse(request.params);
    const [room] = await db.select().from(rooms).where(eq(rooms.connectionString, connString));
    if (!room) return reply.status(404).send({ error: 'Not Found', message: 'Room not found', statusCode: 404 });

    if (room.ownerId !== request.user!.userId && request.user!.role !== 'admin') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Not authorized', statusCode: 403 });
    }

    await db.delete(rooms).where(eq(rooms.connectionString, connString));
    return { message: 'Room deleted' };
  });
}
