import Redis from "ioredis";

let redisClient: Redis | null = null;
let redisHealthy = false;

export const isRedisHealthy = (): boolean =>
  redisHealthy && !!redisClient && redisClient.status === "ready";

export const connectRedis = async (): Promise<void> => {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
    });

    redisClient.on("ready", () => {
      redisHealthy = true;
      console.log("✅ Redis connected");
    });

    redisClient.on("error", (error) => {
      redisHealthy = false;
      console.warn("⚠️  Redis error:", error.message);
    });

    redisClient.on("close", () => {
      redisHealthy = false;
      console.warn("⚠️  Redis connection closed — seat locking disabled");
    });

    redisClient.on("end", () => {
      redisHealthy = false;
      console.warn("⚠️  Redis connection ended — seat locking disabled");
    });

    await redisClient.connect();
    redisHealthy = redisClient.status === "ready";

    if (!redisHealthy) {
      console.warn("⚠️  Redis not ready — seat locking disabled");
    }
  } catch (error) {
    redisHealthy = false;
    console.warn("⚠️  Redis not available — seat locking disabled");
    console.warn(error instanceof Error ? error.message : error);
  }
};

export const getRedis = (): Redis => {
  if (!redisClient) throw new Error("Redis not initialized");
  return redisClient;
};

// Seat lock helpers
export const SEAT_LOCK_TTL = 300; // 5 minutes in seconds

export const lockSeat = async (
  tripId: string,
  seatNumber: string,
  userId: string,
): Promise<boolean> => {
  if (!isRedisHealthy()) return true;

  const key = `seat_lock:${tripId}:${seatNumber}`;
  try {
    const result = await redisClient!.set(
      key,
      userId,
      "EX",
      SEAT_LOCK_TTL,
      "NX",
    );
    return result === "OK";
  } catch (error) {
    redisHealthy = false;
    console.warn("⚠️  Redis lock failed — continuing without seat lock");
    console.warn(error instanceof Error ? error.message : error);
    return true;
  }
};

export const unlockSeat = async (
  tripId: string,
  seatNumber: string,
): Promise<void> => {
  if (!isRedisHealthy()) return;

  const key = `seat_lock:${tripId}:${seatNumber}`;
  try {
    await redisClient!.del(key);
  } catch (error) {
    redisHealthy = false;
    console.warn("⚠️  Redis unlock failed");
    console.warn(error instanceof Error ? error.message : error);
  }
};

export const getSeatLockOwner = async (
  tripId: string,
  seatNumber: string,
): Promise<string | null> => {
  if (!isRedisHealthy()) return null;

  const key = `seat_lock:${tripId}:${seatNumber}`;
  try {
    return await redisClient!.get(key);
  } catch {
    redisHealthy = false;
    return null;
  }
};

export const getLockedSeats = async (tripId: string): Promise<string[]> => {
  if (!isRedisHealthy()) return [];

  try {
    const keys = await redisClient!.keys(`seat_lock:${tripId}:*`);
    return keys.map((k) => k.split(":")[2]);
  } catch {
    redisHealthy = false;
    return [];
  }
};
