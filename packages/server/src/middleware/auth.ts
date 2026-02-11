import type { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import type { TokenPayload } from '@strathub/shared';

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Unauthorized', message: 'Missing or invalid authorization header', statusCode: 401 });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    request.user = payload;
  } catch {
    return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or expired token', statusCode: 401 });
  }
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  await requireAuth(request, reply);
  if (reply.sent) return;

  if (request.user?.role !== 'admin') {
    return reply.status(403).send({ error: 'Forbidden', message: 'Admin access required', statusCode: 403 });
  }
}

export async function optionalAuth(request: FastifyRequest, _reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return;

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    request.user = payload;
  } catch {
    // Token invalid/expired, continue without auth
  }
}
