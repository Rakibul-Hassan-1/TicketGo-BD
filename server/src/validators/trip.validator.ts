import { z } from "zod";

export const searchTripSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  passengers: z.coerce.number().min(1).max(10).optional().default(1),
});

export const createTripSchema = z.object({
  busId: z.string(),
  from: z.string().min(1),
  to: z.string().min(1),
  stops: z.array(z.string()).optional().default([]),
  boardingStops: z.array(z.string()).optional().default([]),
  droppingStops: z.array(z.string()).optional().default([]),
  distance: z.number().positive(),
  departureTime: z.string().datetime(),
  arrivalTime: z.string().datetime(),
  fare: z.number().positive(),
});
