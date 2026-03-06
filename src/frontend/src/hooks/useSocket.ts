import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io('/', { transports: ['websocket', 'polling'] });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  return socketRef;
}

export function useSocketEvent(event: string, handler: (data: any) => void) {
  const socketRef = useSocket();

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.on(event, handler);
    return () => { socket.off(event, handler); };
  }, [event, handler]);
}
