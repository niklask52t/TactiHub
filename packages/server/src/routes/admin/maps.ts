import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/connection.js';
import { maps, mapFloors } from '../../db/schema/index.js';
import { requireAdmin } from '../../middleware/auth.js';
import { processUpload, deleteUpload } from '../../services/upload.service.js';

const mapSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  isCompetitive: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export default async function adminMapsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAdmin);

  // GET /api/admin/games/:gameId/maps
  fastify.get('/games/:gameId/maps', async (request) => {
    const { gameId } = z.object({ gameId: z.string().uuid() }).parse(request.params);
    const result = await db.select().from(maps).where(eq(maps.gameId, gameId)).orderBy(maps.name);
    return { data: result };
  });

  // GET /api/admin/games/:gameId/maps/:id
  fastify.get('/games/:gameId/maps/:id', async (request, reply) => {
    const { id } = z.object({ gameId: z.string().uuid(), id: z.string().uuid() }).parse(request.params);
    const [map] = await db.select().from(maps).where(eq(maps.id, id));
    if (!map) return reply.status(404).send({ error: 'Not Found', message: 'Map not found', statusCode: 404 });

    const floors = await db.select().from(mapFloors).where(eq(mapFloors.mapId, id)).orderBy(mapFloors.floorNumber);
    return { data: { ...map, floors } };
  });

  // POST /api/admin/games/:gameId/maps
  fastify.post('/games/:gameId/maps', async (request, reply) => {
    const { gameId } = z.object({ gameId: z.string().uuid() }).parse(request.params);

    let body: z.infer<typeof mapSchema>;
    let thumbnailPath: string | null = null;

    if (request.isMultipart()) {
      const parts = request.parts();
      const fields: Record<string, string> = {};
      for await (const part of parts) {
        if (part.type === 'file') {
          const result = await processUpload(part, 'maps', { width: 400, height: 300 });
          if (result) thumbnailPath = result;
        } else {
          fields[part.fieldname] = (part as any).value;
        }
      }
      body = mapSchema.parse({
        ...fields,
        isCompetitive: fields.isCompetitive === 'true',
        isActive: fields.isActive === 'true',
      });
    } else {
      body = mapSchema.parse(request.body);
    }

    const [map] = await db.insert(maps).values({
      gameId,
      name: body.name,
      slug: body.slug,
      thumbnail: thumbnailPath,
      isCompetitive: body.isCompetitive ?? true,
      isActive: body.isActive ?? true,
    }).returning();

    return reply.status(201).send({ data: map });
  });

  // POST /api/admin/games/:gameId/maps/:id (update)
  fastify.post('/games/:gameId/maps/:id', async (request, reply) => {
    const { id } = z.object({ gameId: z.string().uuid(), id: z.string().uuid() }).parse(request.params);

    let body: Partial<z.infer<typeof mapSchema>>;
    let thumbnailPath: string | undefined;

    if (request.isMultipart()) {
      const parts = request.parts();
      const fields: Record<string, string> = {};
      for await (const part of parts) {
        if (part.type === 'file') {
          const result = await processUpload(part, 'maps', { width: 400, height: 300 });
          if (result) thumbnailPath = result;
        } else {
          fields[part.fieldname] = (part as any).value;
        }
      }
      body = {
        ...fields,
        isCompetitive: fields.isCompetitive !== undefined ? fields.isCompetitive === 'true' : undefined,
        isActive: fields.isActive !== undefined ? fields.isActive === 'true' : undefined,
      };
    } else {
      body = mapSchema.partial().parse(request.body);
    }

    const updates: Record<string, unknown> = { ...body, updatedAt: new Date() };
    if (thumbnailPath) updates.thumbnail = thumbnailPath;

    const [map] = await db.update(maps).set(updates).where(eq(maps.id, id)).returning();
    if (!map) return reply.status(404).send({ error: 'Not Found', message: 'Map not found', statusCode: 404 });

    return { data: map };
  });

  // POST /api/admin/games/:gameId/maps/:id/delete
  fastify.post('/games/:gameId/maps/:id/delete', async (request, reply) => {
    const { id } = z.object({ gameId: z.string().uuid(), id: z.string().uuid() }).parse(request.params);
    const [map] = await db.select().from(maps).where(eq(maps.id, id));
    if (!map) return reply.status(404).send({ error: 'Not Found', message: 'Map not found', statusCode: 404 });

    if (map.thumbnail) await deleteUpload(map.thumbnail);
    await db.delete(maps).where(eq(maps.id, id));
    return { message: 'Map deleted' };
  });
}
