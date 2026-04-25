import type { FastifyInstance, FastifyRequest } from 'fastify';
import fastifyWebSocket from '@fastify/websocket';
import type { WebSocket } from 'ws';
import type { WSMessage } from '@bunqsy/shared';

// ─── Client registry ──────────────────────────────────────────────────────────

const clients = new Set<WebSocket>();

/**
 * Broadcast a WSMessage to every connected client.
 * Clients in any state other than OPEN are silently skipped.
 */
export function wsEmit(msg: WSMessage): void {
  const text = JSON.stringify(msg);
  for (const client of clients) {
    if (client.readyState === 1 /* WebSocket.OPEN */) {
      client.send(text);
    }
  }
}

// ─── Fastify plugin ───────────────────────────────────────────────────────────

export async function registerWsRoute(fastify: FastifyInstance): Promise<void> {
  await fastify.register(fastifyWebSocket);

  fastify.get(
    '/ws',
    { websocket: true },
    (connection: WebSocket & { socket?: WebSocket }, _req: FastifyRequest) => {
      // @fastify/websocket v11 passes the WebSocket directly, v10 passed a SocketStream with a .socket property
      const socket: WebSocket = connection.socket ?? connection;
      clients.add(socket);

      socket.on('close', () => { clients.delete(socket); });
      socket.on('error', () => { clients.delete(socket); });

      // Acknowledge connection immediately
      socket.send(JSON.stringify({
        type:    'tick',
        payload: { tickId: 'connect', timestamp: new Date().toISOString() },
      } satisfies WSMessage));
    },
  );
}
