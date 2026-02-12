import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/connection.js';
import { gadgets } from '../../db/schema/index.js';
import { requireAdmin } from '../../middleware/auth.js';
import { processUpload, deleteUpload } from '../../services/upload.service.js';

const gadgetSchema = z.object({
  name: z.string().min(1).max(255),
  category: z.enum(['unique', 'secondary', 'general']),
});

export default async function adminGadgetsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAdmin);

  // GET /api/admin/games/:gameId/gadgets
  fastify.get('/games/:gameId/gadgets', async (request) => {
    const { gameId } = z.object({ gameId: z.string().uuid() }).parse(request.params);
    const result = await db.select().from(gadgets).where(eq(gadgets.gameId, gameId)).orderBy(gadgets.category, gadgets.name);
    return { data: result };
  });

  // POST /api/admin/games/:gameId/gadgets
  fastify.post('/games/:gameId/gadgets', async (request, reply) => {
    const { gameId } = z.object({ gameId: z.string().uuid() }).parse(request.params);

    let body: z.infer<typeof gadgetSchema>;
    let iconPath: string | null = null;

    if (request.isMultipart()) {
      const parts = request.parts();
      const fields: Record<string, string> = {};
      for await (const part of parts) {
        if (part.type === 'file') {
          const result = await processUpload(part, 'gadgets', { width: 64, height: 64 });
          if (result) iconPath = result;
        } else {
          fields[part.fieldname] = (part as any).value;
        }
      }
      body = gadgetSchema.parse(fields);
    } else {
      body = gadgetSchema.parse(request.body);
    }

    const [gadget] = await db.insert(gadgets).values({
      gameId,
      name: body.name,
      icon: iconPath,
      category: body.category,
    }).returning();

    return reply.status(201).send({ data: gadget });
  });

  // PUT /api/admin/games/:gameId/gadgets/:id
  fastify.put('/games/:gameId/gadgets/:id', async (request, reply) => {
    const { id } = z.object({ gameId: z.string().uuid(), id: z.string().uuid() }).parse(request.params);

    let body: Partial<z.infer<typeof gadgetSchema>>;
    let iconPath: string | undefined;

    if (request.isMultipart()) {
      const parts = request.parts();
      const fields: Record<string, string> = {};
      for await (const part of parts) {
        if (part.type === 'file') {
          const result = await processUpload(part, 'gadgets', { width: 64, height: 64 });
          if (result) iconPath = result;
        } else {
          fields[part.fieldname] = (part as any).value;
        }
      }
      body = fields;
    } else {
      body = gadgetSchema.partial().parse(request.body);
    }

    const updates: Record<string, unknown> = { ...body, updatedAt: new Date() };
    if (iconPath) updates.icon = iconPath;

    const [gadget] = await db.update(gadgets).set(updates).where(eq(gadgets.id, id)).returning();
    if (!gadget) return reply.status(404).send({ error: 'Not Found', message: 'Gadget not found', statusCode: 404 });

    return { data: gadget };
  });

  // DELETE /api/admin/games/:gameId/gadgets/:id
  fastify.delete('/games/:gameId/gadgets/:id', async (request, reply) => {
    const { id } = z.object({ gameId: z.string().uuid(), id: z.string().uuid() }).parse(request.params);
    const [gadget] = await db.select().from(gadgets).where(eq(gadgets.id, id));
    if (!gadget) return reply.status(404).send({ error: 'Not Found', message: 'Gadget not found', statusCode: 404 });

    if (gadget.icon) await deleteUpload(gadget.icon);
    await db.delete(gadgets).where(eq(gadgets.id, id));
    return { message: 'Gadget deleted' };
  });
}
