import { Router } from "express";
import { unlockSeat } from "../config/redis";
import { emitSeatUnlocked, emitSeatsUnbooked } from "../config/socket";
import {
  getAllBookings,
  getAllUsers,
  getDashboardStats,
} from "../controllers/admin.controller";
import { finalizeBookingApproval } from "../controllers/payment.controller";
import { io } from "../index";
import { authorize, protect } from "../middleware/auth";
import { Booking } from "../models/Booking";
import { Trip } from "../models/Trip";
import { User } from "../models/User";
import { sendError, sendSuccess } from "../utils/apiResponse";

const router = Router();
router.use(protect, authorize("admin"));

router.get("/dashboard", getDashboardStats);
router.get("/users", getAllUsers);
router.get("/bookings", getAllBookings);

router.patch("/bookings/:id/approve", async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    sendError(res, "Booking not found", 404);
    return;
  }

  if (booking.paymentStatus !== "paid") {
    sendError(res, "Only paid bookings can be approved", 400);
    return;
  }

  try {
    await finalizeBookingApproval(booking.bookingId);
    const updated = await Booking.findById(req.params.id)
      .populate("user", "name email phone")
      .populate({
        path: "trip",
        populate: { path: "bus", select: "busName type" },
      });
    sendSuccess(res, { booking: updated }, "Booking approved");
  } catch (error: any) {
    sendError(res, error?.message || "Failed to approve booking", 500);
  }
});

router.patch("/bookings/:id/cancel", async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    sendError(res, "Booking not found", 404);
    return;
  }

  if (booking.bookingStatus === "cancelled") {
    sendError(res, "Booking already cancelled", 400);
    return;
  }

  booking.bookingStatus = "cancelled";
  await booking.save();

  const tripId = booking.trip.toString();
  for (const seat of booking.seats) {
    await unlockSeat(tripId, seat).catch(() => {});
  }

  await Trip.findByIdAndUpdate(tripId, {
    $pull: { bookedSeats: { $in: booking.seats } },
    $push: { availableSeats: { $each: booking.seats } },
  });

  emitSeatsUnbooked(io, tripId, booking.seats);
  emitSeatUnlocked(io, tripId, booking.seats);

  const updated = await Booking.findById(req.params.id)
    .populate("user", "name email phone")
    .populate({
      path: "trip",
      populate: { path: "bus", select: "busName type" },
    });

  sendSuccess(res, { booking: updated }, "Booking cancelled");
});

// Toggle status + optional role change
router.patch("/users/:id/toggle-status", async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    sendError(res, "User not found", 404);
    return;
  }

  // If role provided in body, update role only
  if (req.body.role) {
    user.role = req.body.role;
  } else {
    // Otherwise toggle active status
    user.isActive = !user.isActive;
  }

  await user.save();
  sendSuccess(res, { user }, "User updated");
});

export default router;
