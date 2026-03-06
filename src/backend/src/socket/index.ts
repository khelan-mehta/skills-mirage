import { Server } from 'socket.io';
import { logger } from '../utils/logger';

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    // Worker joins their own room for personalized updates
    socket.on('worker:join', (workerId: string) => {
      socket.join(workerId);
      logger.info(`Worker ${workerId} joined room`);
    });

    // Dashboard subscription
    socket.on('dashboard:subscribe', () => {
      socket.join('dashboard-viewers');
    });

    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });

  // Events emitted by services:
  // io.emit('dashboard:update', { type, data })       — broadcast to all
  // io.to(workerId).emit('worker:risk-updated', data) — to specific worker
  // io.to('dashboard-viewers').emit('dashboard:refresh-complete', data)
}
