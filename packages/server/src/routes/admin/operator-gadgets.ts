import type { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/connection.js';
import { operatorGadgets, gadgets } from '../../db/schema/index.js';
import { requireAdmin } from '../../middleware/auth.js';

export default async function adminOperatorGadgetsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAdmin);

  // GET /api/admin/operators/:id/gadgets
  fastify.get('/operators/:id/gadgets', async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

    const result = await db
      .select({ gadget: gadgets })
      .from(operatorGadgets)
      .innerJoin(gadgets, eq(operatorGadgets.gadgetId, gadgets.id))
      .where(eq(operatorGadgets.operatorId, id));

    return { data: result.map(r => r.gadget) };
  });

  // POST /api/admin/operators/:id/gadgets
  fastify.post('/operators/:id/gadgets', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const { gadgetId } = z.object({ gadgetId: z.string().uuid() }).parse(request.body);

    await db.insert(operatorGadgets).values({
      operatorId: id,
      gadgetId,
    }).onConflictDoNothing();

    return reply.status(201).send({ message: 'Gadget linked to operator' });
  });

  // DELETE /api/admin/operators/:id/gadgets/:gadgetId
  fastify.delete('/operators/:id/gadgets/:gadgetId', async (request) => {
    const { id, gadgetId } = z.object({ id: z.string().uuid(), gadgetId: z.string().uuid() }).parse(request.params);

    await db.delete(operatorGadgets).where(
      and(eq(operatorGadgets.operatorId, id), eq(operatorGadgets.gadgetId, gadgetId))
    );

    return { message: 'Gadget unlinked from operator' };
  });

  // PUT /api/admin/operators/:id/gadgets - Replace all gadgets
  fastify.put('/operators/:id/gadgets', async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const { gadgetIds } = z.object({ gadgetIds: z.array(z.string().uuid()) }).parse(request.body);

    // Delete existing
    await db.delete(operatorGadgets).where(eq(operatorGadgets.operatorId, id));

    // Insert new
    if (gadgetIds.length > 0) {
      await db.insert(operatorGadgets).values(
        gadgetIds.map(gadgetId => ({ operatorId: id, gadgetId }))
      );
    }

    return { message: 'Operator gadgets updated' };
  });
}
