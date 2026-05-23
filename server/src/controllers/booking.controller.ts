import { Response } from "express";
import {
  getLockedSeats,
  isRedisHealthy,
  lockSeat,
  unlockSeat,
} from "../config/redis";
import {
  emitSeatLocked,
  emitSeatUnlocked,
  emitSeatsUnbooked,
} from "../config/socket";
import { io } from "../index";
import { AuthRequest } from "../middleware/auth";
import { Booking } from "../models/Booking";
import { Trip } from "../models/Trip";
import { sendError, sendSuccess } from "../utils/apiResponse";
import { generateBookingId } from "../utils/generateBookingId";
import { getTicketDownloadUrl } from "../utils/ticket";

export const lockSeats = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const { tripId, seats } = req.body;
  const userId = req.user!.id;

  const trip = await Trip.findById(tripId);
  if (!trip) {
    sendError(res, "Trip not found", 404);
    return;
  }

  const results: { seat: string; locked: boolean }[] = [];

  for (const seat of seats) {
    if (!trip.availableSeats.includes(seat)) {
      sendError(res, `Seat ${seat} is not available`, 400);
      return;
    }
    const locked = await lockSeat(tripId, seat, userId);
    results.push({ seat, locked });
    if (!locked) {
      sendError(res, `Seat ${seat} is already locked by another user`, 409);
      return;
    }
  }

  emitSeatLocked(io, tripId, seats);
  sendSuccess(res, { locked: results, ttl: 300 }, "Seats locked for 5 minutes");
};

export const createBooking = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const { tripId, seats, passengers } = req.body;
  const userId = req.user!.id;

  const trip = await Trip.findById(tripId);
  if (!trip) {
    sendError(res, "Trip not found", 404);
    return;
  }

  // Verify seats are still locked by this user when Redis is available.
  if (isRedisHealthy()) {
    const lockedByUser = await getLockedSeats(tripId);
    for (const seat of seats) {
      if (!lockedByUser.includes(seat)) {
        sendError(res, `Seat ${seat} lock expired. Please re-select.`, 400);
        return;
      }
    }
  }

  const totalAmount = trip.fare * seats.length;
  const bookingId = generateBookingId();

  const booking = await Booking.create({
    bookingId,
    user: userId,
    trip: tripId,
    passengers,
    seats,
    totalAmount,
    paymentStatus: "pending",
    bookingStatus: "pending",
  });

  sendSuccess(res, { booking }, "Booking created. Proceed to payment.", 201);
};

export const getUserBookings = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const bookings = await Booking.find({ user: req.user!.id })
    .populate({
      path: "trip",
      populate: { path: "bus", select: "busName type" },
    })
    .sort({ createdAt: -1 });

  const normalizedBookings = bookings.map((booking) => {
    const plain = booking.toObject();
    return {
      ...plain,
      ticketUrl:
        plain.paymentStatus === "paid" && plain.bookingStatus === "confirmed"
          ? getTicketDownloadUrl(plain.bookingId)
          : plain.ticketUrl,
    };
  });

  sendSuccess(res, { bookings: normalizedBookings });
};

export const getBookingById = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const booking = await Booking.findOne({
    _id: req.params.id,
    user: req.user!.id,
  }).populate({ path: "trip", populate: { path: "bus" } });

  if (!booking) {
    sendError(res, "Booking not found", 404);
    return;
  }

  const plain = booking.toObject();
  sendSuccess(res, {
    booking: {
      ...plain,
      ticketUrl:
        plain.paymentStatus === "paid" && plain.bookingStatus === "confirmed"
          ? getTicketDownloadUrl(plain.bookingId)
          : plain.ticketUrl,
    },
  });
};

export const cancelBooking = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const booking = await Booking.findOne({
    _id: req.params.id,
    user: req.user!.id,
  });
  if (!booking) {
    sendError(res, "Booking not found", 404);
    return;
  }
  if (booking.paymentStatus === "paid") {
    sendError(
      res,
      "Paid bookings cannot be cancelled directly. Contact support.",
      400,
    );
    return;
  }

  booking.bookingStatus = "cancelled";
  await booking.save();

  // Release seats
  const tripId = booking.trip.toString();
  for (const seat of booking.seats) {
    await unlockSeat(tripId, seat);
  }
  await Trip.findByIdAndUpdate(tripId, {
    $pull: { bookedSeats: { $in: booking.seats } },
    $push: { availableSeats: { $each: booking.seats } },
  });
  // Notify clients that these seats were returned to available
  emitSeatsUnbooked(io, tripId, booking.seats);
  // Also clear any temporary locks
  emitSeatUnlocked(io, tripId, booking.seats);
  sendSuccess(res, { booking }, "Booking cancelled");
};
