import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('tgb_token') : null;
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
      auth: { token },
      autoConnect: false,
    });
  }
  return socket;
};

export const connectSocket = (): void => {
  const s = getSocket();
  if (!s.connected) s.connect();
};

export const disconnectSocket = (): void => {
  if (socket?.connected) socket.disconnect();
};

export const joinTripRoom = (tripId: string): void => {
  getSocket().emit('join:trip', tripId);
};

export const leaveTripRoom = (tripId: string): void => {
  getSocket().emit('leave:trip', tripId);
};
