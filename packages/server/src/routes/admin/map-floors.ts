import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/connection.js';
import { mapFloors } from '../../db/schema/index.js';
import { requireAdmin } from '../../middleware/auth.js';
import { processUpload, deleteUpload } from '../../services/upload.service.js';

export default async function adminMapFloorsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAdmin);

  // GET /api/admin/maps/:mapId/floors
  fastify.get('/maps/:mapId/floors', async (request) => {
    const { mapId } = z.object({ mapId: z.string().uuid() }).parse(request.params);
    const result = await db.select().from(mapFloors).where(eq(mapFloors.mapId, mapId)).orderBy(mapFloors.floorNumber);
    return { data: result };
  });

  // POST /api/admin/maps/:mapId/floors
  fastify.post('/maps/:mapId/floors', async (request, reply) => {
    const { mapId } = z.object({ mapId: z.string().uuid() }).parse(request.params);

    let name = '';
    let floorNumber = 0;
    let imagePath: string | null = null;

    const parts = request.parts();
    for await (const part of parts) {
      if (part.type === 'file') {
        imagePath = await processUpload(part, 'maps', { width: 1200 });
      } else if (part.fieldname === 'name') {
        name = (part as any).value;
      } else if (part.fieldname === 'floorNumber') {
        floorNumber = parseInt((part as any).value);
      }
    }

    if (!imagePath) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Floor image is required', statusCode: 400 });
    }

    const [floor] = await db.insert(mapFloors).values({
      mapId,
      name,
      floorNumber,
      imagePath,
    }).returning();

    return reply.status(201).send({ data: floor });
  });

  // PUT /api/admin/maps/:mapId/floors/:id
  fastify.put('/maps/:mapId/floors/:id', async (request, reply) => {
    const { id } = z.object({ mapId: z.string().uuid(), id: z.string().uuid() }).parse(request.params);

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (request.isMultipart()) {
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === 'file') {
          updates.imagePath = await processUpload(part, 'maps', { width: 1200 });
        } else if (part.fieldname === 'name') {
          updates.name = (part as any).value;
        } else if (part.fieldname === 'floorNumber') {
          updates.floorNumber = parseInt((part as any).value);
        }
      }
    } else {
      const body = z.object({
        name: z.string().optional(),
        floorNumber: z.number().optional(),
      }).parse(request.body);
      if (body.name !== undefined) updates.name = body.name;
      if (body.floorNumber !== undefined) updates.floorNumber = body.floorNumber;
    }

    const [floor] = await db.update(mapFloors).set(updates).where(eq(mapFloors.id, id)).returning();
    if (!floor) return reply.status(404).send({ error: 'Not Found', message: 'Floor not found', statusCode: 404 });

    return { data: floor };
  });

  // PUT /api/admin/maps/:mapId/floors/reorder
  fastify.put('/maps/:mapId/floors/reorder', async (request) => {
    const { mapId } = z.object({ mapId: z.string().uuid() }).parse(request.params);
    const { order } = z.object({ order: z.array(z.object({ id: z.string().uuid(), floorNumber: z.number() })) }).parse(request.body);

    for (const item of order) {
      await db.update(mapFloors).set({ floorNumber: item.floorNumber, updatedAt: new Date() }).where(eq(mapFloors.id, item.id));
    }

    const result = await db.select().from(mapFloors).where(eq(mapFloors.mapId, mapId)).orderBy(mapFloors.floorNumber);
    return { data: result };
  });

  // DELETE /api/admin/maps/:mapId/floors/:id
  fastify.delete('/maps/:mapId/floors/:id', async (request, reply) => {
    const { id } = z.object({ mapId: z.string().uuid(), id: z.string().uuid() }).parse(request.params);
    const [floor] = await db.select().from(mapFloors).where(eq(mapFloors.id, id));
    if (!floor) return reply.status(404).send({ error: 'Not Found', message: 'Floor not found', statusCode: 404 });

    if (floor.imagePath) await deleteUpload(floor.imagePath);
    await db.delete(mapFloors).where(eq(mapFloors.id, id));
    return { message: 'Floor deleted' };
  });
}
