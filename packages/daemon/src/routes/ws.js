import fastifyWebSocket from '@fastify/websocket';
import { getLastScore } from '../state.js';
// ─── Client registry ──────────────────────────────────────────────────────────
const clients = new Set();
/**
 * Broadcast a WSMessage to every connected client.
 * Clients in any state other than OPEN are silently skipped.
 */
export function wsEmit(msg) {
    const text = JSON.stringify(msg);
    for (const client of clients) {
        if (client.readyState === 1 /* WebSocket.OPEN */) {
            client.send(text);
        }
    }
}
// ─── Fastify plugin ───────────────────────────────────────────────────────────
export async function registerWsRoute(fastify) {
    await fastify.register(fastifyWebSocket);
    fastify.get('/ws', { websocket: true }, (connection, _req) => {
        // @fastify/websocket v11 passes the WebSocket directly, v10 passed a SocketStream with a .socket property
        const socket = connection.socket ?? connection;
        clients.add(socket);
        socket.on('close', () => { clients.delete(socket); });
        socket.on('error', () => { clients.delete(socket); });
        // Push last known score immediately so new clients don't wait for next tick
        const lastScore = getLastScore();
        if (lastScore) {
            socket.send(JSON.stringify({ type: 'score_update', payload: lastScore }));
        }
        // Acknowledge connection
        socket.send(JSON.stringify({
            type: 'tick',
            payload: { tickId: 'connect', timestamp: new Date().toISOString() },
        }));
    });
}
