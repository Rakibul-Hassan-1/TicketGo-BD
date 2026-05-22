import Redis from "ioredis";

let redisClient: Redis | null = null;
let redisHealthy = false;
let redisWarningShown = false;

const warnRedisOnce = (message: string, error?: unknown): void => {
  if (redisWarningShown) return;
  redisWarningShown = true;
  console.warn(message);
  if (error) {
    console.warn(error instanceof Error ? error.message : error);
  }
};

export const isRedisHealthy = (): boolean =>
  redisHealthy && !!redisClient && redisClient.status === "ready";

export const connectRedis = async (): Promise<void> => {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    redisHealthy = false;
    warnRedisOnce("⚠️  Redis not configured — seat locking disabled");
    return;
  }

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
      retryStrategy: () => null,
      reconnectOnError: () => false,
    });

    redisClient.on("ready", () => {
      redisHealthy = true;
      redisWarningShown = false;
      console.log("✅ Redis connected");
    });

    redisClient.on("error", (error) => {
      redisHealthy = false;
      warnRedisOnce("⚠️  Redis error — seat locking disabled", error);
    });

    redisClient.on("close", () => {
      redisHealthy = false;
      warnRedisOnce("⚠️  Redis connection closed — seat locking disabled");
    });

    redisClient.on("end", () => {
      redisHealthy = false;
      warnRedisOnce("⚠️  Redis connection ended — seat locking disabled");
    });

    await redisClient.connect();
    redisHealthy = redisClient.status === "ready";

    if (!redisHealthy) {
      warnRedisOnce("⚠️  Redis not ready — seat locking disabled");
    }
  } catch (error) {
    redisHealthy = false;
    warnRedisOnce("⚠️  Redis not available — seat locking disabled", error);
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
    warnRedisOnce(
      "⚠️  Redis lock failed — continuing without seat lock",
      error,
    );
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
    warnRedisOnce("⚠️  Redis unlock failed");
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
