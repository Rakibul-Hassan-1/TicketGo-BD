import { Request, Response } from 'express';
import { Trip } from '../models/Trip';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { getLockedSeats } from '../config/redis';

export const searchTrips = async (req: Request, res: Response): Promise<void> => {
  const { from, to, date, passengers = 1 } = req.query;

  const startOfDay = new Date(date as string);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date as string);
  endOfDay.setHours(23, 59, 59, 999);

  const trips = await Trip.find({
    'route.from': { $regex: new RegExp(from as string, 'i') },
    'route.to': { $regex: new RegExp(to as string, 'i') },
    departureTime: { $gte: startOfDay, $lte: endOfDay },
    status: 'scheduled',
    $expr: { $gte: [{ $size: '$availableSeats' }, Number(passengers)] },
  }).populate({
    path: 'bus',
    select: 'busName busNumber type amenities totalSeats',
    populate: { path: 'operator', select: 'name' },
  }).sort({ departureTime: 1 });

  sendSuccess(res, { trips, count: trips.length });
};

export const getTripById = async (req: Request, res: Response): Promise<void> => {
  const trip = await Trip.findById(req.params.id).populate({
    path: 'bus',
    populate: { path: 'operator', select: 'name phone' },
  });

  if (!trip) {
    sendError(res, 'Trip not found', 404);
    return;
  }

  const lockedSeats = await getLockedSeats(trip._id.toString()).catch(() => []);

  sendSuccess(res, { trip, lockedSeats });
};

export const getPopularRoutes = async (_req: Request, res: Response): Promise<void> => {
  const routes = await Trip.aggregate([
    { $match: { status: 'scheduled', departureTime: { $gte: new Date() } } },
    { $group: { _id: { from: '$route.from', to: '$route.to' }, count: { $sum: 1 }, minFare: { $min: '$fare' } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);
  sendSuccess(res, { routes });
};
