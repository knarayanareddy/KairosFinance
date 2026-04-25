import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDb } from '../memory/db.js';
import { generateForecast, getCachedForecast, storeForecastCache } from '../forecast/engine.js';

export async function registerForecastRoute(fastify: FastifyInstance): Promise<void> {
  // ── GET /api/forecast ────────────────────────────────────────────────────────
  fastify.get(
    '/api/forecast',
    async (req: FastifyRequest<{ Querystring: { refresh?: string } }>, reply: FastifyReply) => {
      const db      = getDb();
      const refresh = req.query.refresh === 'true';

      if (!refresh) {
        const cached = getCachedForecast(db);
        if (cached) return reply.send(cached);
      }

      const points = generateForecast(db);
      storeForecastCache(db, points);
      return reply.send(points);
    },
  );
}
