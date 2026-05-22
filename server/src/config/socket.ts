import { Server, Socket } from "socket.io";
import { verifyToken } from "../utils/jwt";
import { getLockedSeats } from "./redis";

type SeatUpdatePayload = {
  tripId: string;
  seats: string[];
};

export const initSocket = (io: Server): void => {
  io.use(async (socket: Socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication required"));

    try {
      const decoded = verifyToken(token);
      (socket as any).userId = decoded.id;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Join trip room to receive seat updates
    socket.on("join:trip", async (tripId: string) => {
      socket.join(`trip:${tripId}`);
      const lockedSeats = await getLockedSeats(tripId).catch(() => []);
      socket.emit("seats:locked", { tripId, seats: lockedSeats });
    });

    socket.on("leave:trip", (tripId: string) => {
      socket.leave(`trip:${tripId}`);
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });
};

// Emit seat lock/unlock to all clients in a trip room
export const emitSeatLocked = (
  io: Server,
  tripId: string,
  seats: string[],
): void => {
  io.to(`trip:${tripId}`).emit("seat:locked", {
    tripId,
    seats,
  } satisfies SeatUpdatePayload);
};

export const emitSeatUnlocked = (
  io: Server,
  tripId: string,
  seats: string[],
): void => {
  io.to(`trip:${tripId}`).emit("seat:unlocked", {
    tripId,
    seats,
  } satisfies SeatUpdatePayload);
};

// Emit seats that have been booked so clients can update bookedSeats
export const emitSeatsBooked = (
  io: Server,
  tripId: string,
  seats: string[],
): void => {
  io.to(`trip:${tripId}`).emit("seats:booked", {
    tripId,
    seats,
  } satisfies SeatUpdatePayload);
};

// Emit seats that have been moved back to available (unbooked)
export const emitSeatsUnbooked = (
  io: Server,
  tripId: string,
  seats: string[],
): void => {
  io.to(`trip:${tripId}`).emit("seats:unbooked", {
    tripId,
    seats,
  } satisfies SeatUpdatePayload);
};
