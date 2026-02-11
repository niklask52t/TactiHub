import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/connection.js';
import { operatorSlots, operators } from '../db/schema/index.js';
import { requireAuth } from '../middleware/auth.js';

export default async function operatorSlotsRoutes(fastify: FastifyInstance) {
  // PUT /api/operator-slots/:id
  fastify.put('/operator-slots/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const { operatorId } = z.object({ operatorId: z.string().uuid().nullable() }).parse(request.body);

    const [slot] = await db.update(operatorSlots).set({
      operatorId,
      updatedAt: new Date(),
    }).where(eq(operatorSlots.id, id)).returning();

    if (!slot) return reply.status(404).send({ error: 'Not Found', message: 'Slot not found', statusCode: 404 });

    let operator = null;
    if (slot.operatorId) {
      const [op] = await db.select().from(operators).where(eq(operators.id, slot.operatorId));
      operator = op || null;
    }

    return { data: { ...slot, operator } };
  });
}
