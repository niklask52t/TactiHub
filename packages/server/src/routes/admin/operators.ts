import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/connection.js';
import { operators } from '../../db/schema/index.js';
import { requireAdmin } from '../../middleware/auth.js';
import { processUpload, deleteUpload } from '../../services/upload.service.js';

const operatorSchema = z.object({
  name: z.string().min(1).max(255),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  isAttacker: z.boolean(),
});

export default async function adminOperatorsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAdmin);

  // GET /api/admin/games/:gameId/operators
  fastify.get('/games/:gameId/operators', async (request) => {
    const { gameId } = z.object({ gameId: z.string().uuid() }).parse(request.params);
    const result = await db.select().from(operators).where(eq(operators.gameId, gameId)).orderBy(operators.name);
    return { data: result };
  });

  // POST /api/admin/games/:gameId/operators
  fastify.post('/games/:gameId/operators', async (request, reply) => {
    const { gameId } = z.object({ gameId: z.string().uuid() }).parse(request.params);

    let body: z.infer<typeof operatorSchema>;
    let iconPath: string | null = null;

    if (request.isMultipart()) {
      const parts = request.parts();
      const fields: Record<string, string> = {};
      for await (const part of parts) {
        if (part.type === 'file') {
          const result = await processUpload(part, 'operators', { width: 64, height: 64 });
          if (result) iconPath = result;
        } else {
          fields[part.fieldname] = (part as any).value;
        }
      }
      body = operatorSchema.parse({
        ...fields,
        isAttacker: fields.isAttacker === 'true',
      });
    } else {
      body = operatorSchema.parse(request.body);
    }

    const [operator] = await db.insert(operators).values({
      gameId,
      name: body.name,
      icon: iconPath,
      color: body.color,
      isAttacker: body.isAttacker,
    }).returning();

    return reply.status(201).send({ data: operator });
  });

  // POST /api/admin/games/:gameId/operators/:id (update)
  fastify.post('/games/:gameId/operators/:id', async (request, reply) => {
    const { id } = z.object({ gameId: z.string().uuid(), id: z.string().uuid() }).parse(request.params);

    let body: Partial<z.infer<typeof operatorSchema>>;
    let iconPath: string | undefined;

    if (request.isMultipart()) {
      const parts = request.parts();
      const fields: Record<string, string> = {};
      for await (const part of parts) {
        if (part.type === 'file') {
          const result = await processUpload(part, 'operators', { width: 64, height: 64 });
          if (result) iconPath = result;
        } else {
          fields[part.fieldname] = (part as any).value;
        }
      }
      body = {
        ...fields,
        isAttacker: fields.isAttacker !== undefined ? fields.isAttacker === 'true' : undefined,
      };
    } else {
      body = operatorSchema.partial().parse(request.body);
    }

    const updates: Record<string, unknown> = { ...body, updatedAt: new Date() };
    if (iconPath) updates.icon = iconPath;

    const [operator] = await db.update(operators).set(updates).where(eq(operators.id, id)).returning();
    if (!operator) return reply.status(404).send({ error: 'Not Found', message: 'Operator not found', statusCode: 404 });

    return { data: operator };
  });

  // POST /api/admin/games/:gameId/operators/:id/delete
  fastify.post('/games/:gameId/operators/:id/delete', async (request, reply) => {
    const { id } = z.object({ gameId: z.string().uuid(), id: z.string().uuid() }).parse(request.params);
    const [operator] = await db.select().from(operators).where(eq(operators.id, id));
    if (!operator) return reply.status(404).send({ error: 'Not Found', message: 'Operator not found', statusCode: 404 });

    if (operator.icon) await deleteUpload(operator.icon);
    await db.delete(operators).where(eq(operators.id, id));
    return { message: 'Operator deleted' };
  });
}
