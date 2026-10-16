import { Server } from 'socket.io';

export function attachKontainerRealtime(server, allowedOrigins) {
  const io = new Server(server, {
    serveClient: false,
    maxHttpBufferSize: 1024,
    cors: { origin: allowedOrigins },
    allowRequest: (req, callback) => callback(null, !req.headers.origin || allowedOrigins.includes(req.headers.origin)),
  });
  const channel = io.of('/kontainer');
  return {
    notify: () => channel.emit('kontainer:changed'),
    close: () => new Promise(resolve => io.close(resolve)),
  };
}

export function notifyKontainerWrites(notify) {
  return (req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      res.once('finish', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) notify();
      });
    }
    next();
  };
}
