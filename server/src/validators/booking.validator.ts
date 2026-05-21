import { z } from 'zod';

export const createBookingSchema = z.object({
  tripId: z.string(),
  seats: z.array(z.string()).min(1).max(10),
  passengers: z.array(z.object({
    name: z.string().min(2),
    age: z.number().min(1).max(120),
    gender: z.enum(['male', 'female', 'other']),
    seatNumber: z.string(),
  })),
});

export const lockSeatsSchema = z.object({
  tripId: z.string(),
  seats: z.array(z.string()).min(1).max(10),
});
