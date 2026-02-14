import type { FastifyInstance } from 'fastify';
import { eq, isNull, desc } from 'drizzle-orm';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { db } from '../../db/connection.js';
import { registrationTokens } from '../../db/schema/index.js';
import { requireAdmin } from '../../middleware/auth.js';

export default async function adminTokensRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAdmin);

  // GET /api/admin/tokens
  fastify.get('/', async () => {
    const result = await db.select().from(registrationTokens).orderBy(desc(registrationTokens.createdAt));
    return { data: result };
  });

  // POST /api/admin/tokens
  fastify.post('/', async (request, reply) => {
    const { count = 1, expiresInDays = 7 } = z.object({
      count: z.number().min(1).max(50).optional(),
      expiresInDays: z.number().min(1).max(365).optional(),
    }).parse(request.body);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const tokens = [];
    for (let i = 0; i < count; i++) {
      const [token] = await db.insert(registrationTokens).values({
        token: nanoid(16),
        createdBy: request.user!.userId,
        expiresAt,
      }).returning();
      tokens.push(token);
    }

    return reply.status(201).send({ data: tokens });
  });

  // POST /api/admin/tokens/:id/delete
  fastify.post('/:id/delete', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    await db.delete(registrationTokens).where(eq(registrationTokens.id, id));
    return { message: 'Token deleted' };
  });
}
