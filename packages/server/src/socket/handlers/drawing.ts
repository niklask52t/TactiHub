import type { Server, Socket } from 'socket.io';
import { roomStates } from '../index.js';
import { db } from '../../db/connection.js';
import { draws } from '../../db/schema/index.js';
import { eq } from 'drizzle-orm';

export function setupDrawingHandlers(io: Server, socket: Socket, userId: string) {
  socket.on('draw:create', async ({ battleplanFloorId, draws: drawItems }) => {
    const connString = getSocketRoom(socket);
    if (!connString) return;

    try {
      const created = [];
      for (const item of drawItems) {
        const [draw] = await db.insert(draws).values({
          battleplanFloorId,
          userId,
          type: item.type,
          originX: item.originX,
          originY: item.originY,
          destinationX: item.destinationX,
          destinationY: item.destinationY,
          data: item.data,
        }).returning();
        created.push(draw);
      }

      // Broadcast to others in the room
      socket.to(connString).emit('draw:created', { userId, draws: created });
    } catch (err) {
      console.error('Error creating draws:', err);
    }
  });

  socket.on('draw:delete', async ({ drawIds }) => {
    const connString = getSocketRoom(socket);
    if (!connString) return;

    try {
      for (const id of drawIds) {
        await db.update(draws).set({ isDeleted: true, updatedAt: new Date() }).where(eq(draws.id, id));
      }
      socket.to(connString).emit('draw:deleted', { userId, drawIds });
    } catch (err) {
      console.error('Error deleting draws:', err);
    }
  });

  socket.on('draw:update', async ({ drawId, data }) => {
    const connString = getSocketRoom(socket);
    if (!connString) return;

    try {
      await db.update(draws).set({ ...data, updatedAt: new Date() }).where(eq(draws.id, drawId));
      socket.to(connString).emit('draw:updated', { userId, drawId, data });
    } catch (err) {
      console.error('Error updating draw:', err);
    }
  });
}

function getSocketRoom(socket: Socket): string | null {
  for (const [connString, state] of roomStates) {
    if (state.users.has(socket.id)) {
      return connString;
    }
  }
  return null;
}
