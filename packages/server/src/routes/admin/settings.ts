import type { FastifyInstance } from 'fastify';
import { eq, count } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/connection.js';
import { settings, users, battleplans, games, maps } from '../../db/schema/index.js';
import { requireAdmin } from '../../middleware/auth.js';
import { desc } from 'drizzle-orm';

export default async function adminSettingsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAdmin);

  // GET /api/admin/settings
  fastify.get('/', async () => {
    const result = await db.select().from(settings);
    const settingsMap: Record<string, string> = {};
    for (const s of result) {
      settingsMap[s.key] = s.value;
    }
    return {
      data: {
        registrationEnabled: settingsMap['registration_enabled'] !== 'false',
      },
    };
  });

  // PUT /api/admin/settings
  fastify.put('/', async (request) => {
    const body = z.object({
      registrationEnabled: z.boolean().optional(),
    }).parse(request.body);

    if (body.registrationEnabled !== undefined) {
      await db.insert(settings)
        .values({ key: 'registration_enabled', value: String(body.registrationEnabled) })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: String(body.registrationEnabled) },
        });
    }

    return { message: 'Settings updated' };
  });

  // GET /api/admin/stats
  fastify.get('/stats', async () => {
    const [{ total: totalUsers }] = await db.select({ total: count() }).from(users);
    const [{ total: totalBattleplans }] = await db.select({ total: count() }).from(battleplans);
    const [{ total: totalGames }] = await db.select({ total: count() }).from(games);
    const [{ total: totalMaps }] = await db.select({ total: count() }).from(maps);

    const recentUsers = await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      createdAt: users.createdAt,
    }).from(users).orderBy(desc(users.createdAt)).limit(10);

    return {
      data: {
        totalUsers,
        totalBattleplans,
        totalGames,
        totalMaps,
        recentUsers,
      },
    };
  });
}
