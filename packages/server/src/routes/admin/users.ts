import type { FastifyInstance } from 'fastify';
import { eq, desc, sql, count } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/connection.js';
import { users } from '../../db/schema/index.js';
import { requireAdmin } from '../../middleware/auth.js';
import { sendAdminVerifiedEmail } from '../../services/email.service.js';

export default async function adminUsersRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAdmin);

  // GET /api/admin/users
  fastify.get('/', async (request) => {
    const { page = '1', pageSize = '20' } = request.query as Record<string, string>;
    const p = Math.max(1, parseInt(page));
    const ps = Math.min(100, Math.max(1, parseInt(pageSize)));

    const [{ total }] = await db.select({ total: count() }).from(users);
    const result = await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      emailVerifiedAt: users.emailVerifiedAt,
      role: users.role,
      deactivatedAt: users.deactivatedAt,
      deletionScheduledAt: users.deletionScheduledAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users)
      .orderBy(desc(users.createdAt))
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

  // POST /api/admin/users/:id/role
  fastify.post('/:id/role', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const { role } = z.object({ role: z.enum(['admin', 'user']) }).parse(request.body);

    // Prevent self-demotion
    if (id === request.user!.userId && role !== 'admin') {
      return reply.status(400).send({ error: 'Bad Request', message: 'Cannot change your own role', statusCode: 400 });
    }

    const [user] = await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    if (!user) return reply.status(404).send({ error: 'Not Found', message: 'User not found', statusCode: 404 });

    return { data: { id: user.id, username: user.username, email: user.email, role: user.role } };
  });

  // POST /api/admin/users/:id/verify
  fastify.post('/:id/verify', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) return reply.status(404).send({ error: 'Not Found', message: 'User not found', statusCode: 404 });

    if (user.emailVerifiedAt) {
      return reply.status(400).send({ error: 'Bad Request', message: 'User is already verified', statusCode: 400 });
    }

    const [updated] = await db.update(users)
      .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    // Send notification email (best-effort)
    try {
      await sendAdminVerifiedEmail(updated.email, updated.username);
    } catch {
      // Email delivery failure should not block verification
    }

    return { data: { id: updated.id, username: updated.username, email: updated.email, emailVerifiedAt: updated.emailVerifiedAt } };
  });

  // POST /api/admin/users/:id/reactivate
  fastify.post('/:id/reactivate', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) return reply.status(404).send({ error: 'Not Found', message: 'User not found', statusCode: 404 });

    if (!user.deactivatedAt) {
      return reply.status(400).send({ error: 'Bad Request', message: 'User is not deactivated', statusCode: 400 });
    }

    const [updated] = await db.update(users).set({
      deactivatedAt: null,
      deletionScheduledAt: null,
      updatedAt: new Date(),
    }).where(eq(users.id, id)).returning();

    return { data: { id: updated.id, username: updated.username, email: updated.email }, message: 'User reactivated' };
  });

  // POST /api/admin/users/:id/delete
  fastify.post('/:id/delete', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

    if (id === request.user!.userId) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Cannot delete yourself', statusCode: 400 });
    }

    await db.delete(users).where(eq(users.id, id));
    return { message: 'User deleted' };
  });
}
