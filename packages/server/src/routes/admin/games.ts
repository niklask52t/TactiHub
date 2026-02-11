import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/connection.js';
import { games } from '../../db/schema/index.js';
import { requireAdmin } from '../../middleware/auth.js';
import { processUpload, deleteUpload } from '../../services/upload.service.js';

const gameSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export default async function adminGamesRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAdmin);

  // GET /api/admin/games
  fastify.get('/', async () => {
    const result = await db.select().from(games).orderBy(games.name);
    return { data: result };
  });

  // GET /api/admin/games/:id
  fastify.get('/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const [game] = await db.select().from(games).where(eq(games.id, id));
    if (!game) return reply.status(404).send({ error: 'Not Found', message: 'Game not found', statusCode: 404 });
    return { data: game };
  });

  // POST /api/admin/games
  fastify.post('/', async (request, reply) => {
    let body: z.infer<typeof gameSchema>;
    let iconPath: string | null = null;

    if (request.isMultipart()) {
      const parts = request.parts();
      const fields: Record<string, string> = {};
      for await (const part of parts) {
        if (part.type === 'file') {
          iconPath = await processUpload(part, 'games', { width: 128, height: 128 });
        } else {
          fields[part.fieldname] = (part as any).value;
        }
      }
      body = gameSchema.parse({
        ...fields,
        isActive: fields.isActive === 'true',
      });
    } else {
      body = gameSchema.parse(request.body);
    }

    const [game] = await db.insert(games).values({
      name: body.name,
      slug: body.slug,
      description: body.description,
      icon: iconPath,
      isActive: body.isActive ?? true,
    }).returning();

    return reply.status(201).send({ data: game });
  });

  // PUT /api/admin/games/:id
  fastify.put('/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

    let body: Partial<z.infer<typeof gameSchema>>;
    let iconPath: string | undefined;

    if (request.isMultipart()) {
      const parts = request.parts();
      const fields: Record<string, string> = {};
      for await (const part of parts) {
        if (part.type === 'file') {
          iconPath = await processUpload(part, 'games', { width: 128, height: 128 });
        } else {
          fields[part.fieldname] = (part as any).value;
        }
      }
      body = {
        ...fields,
        isActive: fields.isActive !== undefined ? fields.isActive === 'true' : undefined,
      };
    } else {
      body = gameSchema.partial().parse(request.body);
    }

    const updates: Record<string, unknown> = { ...body, updatedAt: new Date() };
    if (iconPath) updates.icon = iconPath;

    const [game] = await db.update(games).set(updates).where(eq(games.id, id)).returning();
    if (!game) return reply.status(404).send({ error: 'Not Found', message: 'Game not found', statusCode: 404 });

    return { data: game };
  });

  // DELETE /api/admin/games/:id
  fastify.delete('/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const [game] = await db.select().from(games).where(eq(games.id, id));
    if (!game) return reply.status(404).send({ error: 'Not Found', message: 'Game not found', statusCode: 404 });

    if (game.icon) await deleteUpload(game.icon);
    await db.delete(games).where(eq(games.id, id));
    return { message: 'Game deleted' };
  });
}
