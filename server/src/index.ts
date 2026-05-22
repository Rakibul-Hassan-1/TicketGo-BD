import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import http from "http";
import morgan from "morgan";
import { Server } from "socket.io";

import { connectDB } from "./config/database";
import { connectRedis } from "./config/redis";
import { initSocket } from "./config/socket";
import { errorHandler } from "./middleware/errorHandler";
import { rateLimiter } from "./middleware/rateLimiter";

// Routes
import adminRoutes from "./routes/admin.routes";
import authRoutes from "./routes/auth.routes";
import bookingRoutes from "./routes/booking.routes";
import busRoutes from "./routes/bus.routes";
import operatorRoutes from "./routes/operator.routes";
import paymentRoutes from "./routes/payment.routes";
import tripRoutes from "./routes/trip.routes";

dotenv.config();

const app = express();
const httpServer = http.createServer(app);

const frontendOrigin = (
  process.env.FRONTEND_URL || "http://localhost:3000"
).replace(/\/+$/, "");

// Socket.IO setup
export const io = new Server(httpServer, {
  cors: {
    origin: frontendOrigin,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: frontendOrigin,
    credentials: true,
  }),
);
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/buses", busRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/operator", operatorRoutes);

// Error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  await connectDB();
  await connectRedis();
  initSocket(io);

  httpServer.listen(PORT, () => {
    console.log(`🚀 TicketGo BD server running on port ${PORT}`);
    console.log(`📡 Socket.IO ready`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  });
}

bootstrap().catch(console.error);
