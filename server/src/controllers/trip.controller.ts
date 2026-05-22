import { Request, Response } from "express";
import { getLockedSeats } from "../config/redis";
import { Booking } from "../models/Booking";
import { Trip } from "../models/Trip";
import { sendError, sendSuccess } from "../utils/apiResponse";

const getBookedSeatMap = async (tripIds: string[]) => {
  const bookings = await Booking.find({
    trip: { $in: tripIds },
    paymentStatus: "paid",
    bookingStatus: { $ne: "cancelled" },
  }).select("trip seats");

  const bookedMap = new Map<string, Set<string>>();
  for (const booking of bookings) {
    const id = booking.trip.toString();
    if (!bookedMap.has(id)) bookedMap.set(id, new Set<string>());
    for (const seat of booking.seats || []) {
      bookedMap.get(id)!.add(seat);
    }
  }

  return bookedMap;
};

export const searchTrips = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { from, to, date, passengers = 1 } = req.query;

  const startOfDay = new Date(date as string);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date as string);
  endOfDay.setHours(23, 59, 59, 999);

  const trips = await Trip.find({
    "route.from": { $regex: new RegExp(from as string, "i") },
    "route.to": { $regex: new RegExp(to as string, "i") },
    departureTime: { $gte: startOfDay, $lte: endOfDay },
    status: "scheduled",
  })
    .populate({
      path: "bus",
      select: "busName busNumber type amenities totalSeats",
      populate: { path: "operator", select: "name" },
    })
    .sort({ departureTime: 1 });

  const tripIds = trips.map((trip) => trip._id.toString());
  const bookedMap = await getBookedSeatMap(tripIds);

  const normalizedTrips = trips
    .map((tripDoc: any) => {
      const trip = tripDoc.toObject();
      const bookedSeats = Array.from(bookedMap.get(trip._id.toString()) || []);
      const totalSeats = Number(trip.bus?.totalSeats || 0);
      const availableSeatCount = Math.max(totalSeats - bookedSeats.length, 0);

      return {
        ...trip,
        bookedSeats,
        availableSeatCount,
      };
    })
    .filter((trip) => trip.availableSeatCount >= Number(passengers));

  sendSuccess(res, { trips: normalizedTrips, count: normalizedTrips.length });
};

export const getTripById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const trip = await Trip.findById(req.params.id).populate({
    path: "bus",
    populate: { path: "operator", select: "name phone" },
  });

  if (!trip) {
    sendError(res, "Trip not found", 404);
    return;
  }

  const bookedMap = await getBookedSeatMap([trip._id.toString()]);
  const bookedSeats = Array.from(bookedMap.get(trip._id.toString()) || []);
  const allSeats: string[] = ((trip as any).bus?.seats || []).map(
    (s: any) => s.number,
  );
  const bookedSeatSet = new Set(bookedSeats);
  const availableSeats = allSeats.filter((seat) => !bookedSeatSet.has(seat));

  const tripData: any = trip.toObject();
  tripData.bookedSeats = bookedSeats;
  tripData.availableSeats = availableSeats;

  // Self-heal stale seat arrays on Trip documents.
  if (
    trip.bookedSeats.length !== bookedSeats.length ||
    trip.availableSeats.length !== availableSeats.length
  ) {
    await Trip.findByIdAndUpdate(trip._id, {
      bookedSeats,
      availableSeats,
    }).catch(() => {});
  }

  const lockedSeats = await getLockedSeats(trip._id.toString()).catch(() => []);

  sendSuccess(res, { trip: tripData, lockedSeats });
};

export const getPopularRoutes = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  const routes = await Trip.aggregate([
    { $match: { status: "scheduled", departureTime: { $gte: new Date() } } },
    {
      $group: {
        _id: { from: "$route.from", to: "$route.to" },
        count: { $sum: 1 },
        minFare: { $min: "$fare" },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);
  sendSuccess(res, { routes });
};
