import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("tgb_token");
};

export const getSocket = (): Socket => {
  const token = getAuthToken();

  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000", {
      auth: { token },
      autoConnect: false,
    });
  } else {
    // Keep auth token fresh for reconnects after login/logout.
    socket.auth = { token };
  }

  return socket;
};

export const connectSocket = (): void => {
  const s = getSocket();
  s.auth = { token: getAuthToken() };
  if (!s.connected) s.connect();
};

export const disconnectSocket = (): void => {
  if (socket?.connected) socket.disconnect();
};

export const joinTripRoom = (tripId: string): void => {
  getSocket().emit("join:trip", tripId);
};

export const leaveTripRoom = (tripId: string): void => {
  getSocket().emit("leave:trip", tripId);
};
