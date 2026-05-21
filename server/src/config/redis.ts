import Redis from 'ioredis';

let redisClient: Redis;

export const connectRedis = async (): Promise<void> => {
  try {
    redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 0,
      enableOfflineQueue: false,
      lazyConnect: true,
      retryStrategy: () => null, // ← এটাই fix — retry বন্ধ করে
    });

    redisClient.on('error', () => {}); // ← error suppress করো

    await redisClient.connect().catch(() => {});
    console.log('✅ Redis connected');
  } catch {
    console.warn('⚠️  Redis not available — seat locking disabled');
  }
};

export const getRedis = (): Redis => {
  if (!redisClient) throw new Error('Redis not initialized');
  return redisClient;
};

// Seat lock helpers
export const SEAT_LOCK_TTL = 300; // 5 minutes in seconds

export const lockSeat = async (tripId: string, seatNumber: string, userId: string): Promise<boolean> => {
  const key = `seat_lock:${tripId}:${seatNumber}`;
  const result = await redisClient.set(key, userId, 'EX', SEAT_LOCK_TTL, 'NX');
  return result === 'OK';
};

export const unlockSeat = async (tripId: string, seatNumber: string): Promise<void> => {
  const key = `seat_lock:${tripId}:${seatNumber}`;
  await redisClient.del(key);
};

export const getSeatLockOwner = async (tripId: string, seatNumber: string): Promise<string | null> => {
  const key = `seat_lock:${tripId}:${seatNumber}`;
  return redisClient.get(key);
};

export const getLockedSeats = async (tripId: string): Promise<string[]> => {
  const keys = await redisClient.keys(`seat_lock:${tripId}:*`);
  return keys.map(k => k.split(':')[2]);
};
