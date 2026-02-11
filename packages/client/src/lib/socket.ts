import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth.store';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(window.location.origin, {
      autoConnect: false,
      auth: {
        token: useAuthStore.getState().accessToken,
      },
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  s.auth = { token: useAuthStore.getState().accessToken };
  if (!s.connected) {
    s.connect();
  }
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect();
  }
}
