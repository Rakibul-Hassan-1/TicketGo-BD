import { Router } from "express";
import { emitTripChanged, emitTripDeleted } from "../config/socket";
import {
  getPopularRoutes,
  getTripById,
  searchTrips,
} from "../controllers/trip.controller";
import { io } from "../index";
import { authorize, protect } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { Booking } from "../models/Booking";
import { Bus } from "../models/Bus";
import { Trip } from "../models/Trip";
import { sendError, sendSuccess } from "../utils/apiResponse";
import { createTripSchema } from "../validators/trip.validator";

const router = Router();

router.get("/search", searchTrips);
router.get("/popular-routes", getPopularRoutes);
router.get("/:id", getTripById);

router.post(
  "/",
  protect,
  authorize("admin", "operator"),
  validate(createTripSchema),
  async (req: any, res) => {
    console.debug("[debug] POST /trips payload:", JSON.stringify(req.body));
    const {
      busId,
      from,
      to,
      stops,
      boardingStops,
      droppingStops,
      distance,
      departureTime,
      arrivalTime,
      fare,
    } = req.body;

    const bus = await Bus.findById(busId);
    if (!bus) {
      sendError(res, "Bus not found", 404);
      return;
    }

    const availableSeats = bus.seats.map((s) => s.number);

    const created = await Trip.create({
      bus: busId,
      route: {
        from,
        to,
        distance: Number(distance),
        stops: stops || [],
        boardingStops: boardingStops || [],
        droppingStops: droppingStops || [],
      },
      departureTime,
      arrivalTime,
      fare,
      availableSeats,
      bookedSeats: [],
    });

    // Populate before returning so clients get consistent shape (including route.stops)
    const trip = await Trip.findById(created._id).populate({
      path: "bus",
      select: "busName busNumber type amenities totalSeats",
      populate: { path: "operator", select: "name" },
    });

    // Notify clients about new trip
    try {
      emitTripChanged(io, trip);
    } catch (err) {}

    sendSuccess(res, { trip }, "Trip created", 201);
  },
);

router.patch(
  "/:id",
  protect,
  authorize("admin", "operator"),
  async (req, res) => {
    // Normalize route-related fields into nested `route` updates so
    // fields like `stops`, `from`, `to`, `distance` are correctly set.
    const body: any = { ...req.body };
    const routeUpdates: any = {};
    if (body.from !== undefined) {
      routeUpdates["route.from"] = body.from;
      delete body.from;
    }
    if (body.to !== undefined) {
      routeUpdates["route.to"] = body.to;
      delete body.to;
    }
    if (body.distance !== undefined) {
      routeUpdates["route.distance"] = body.distance;
      delete body.distance;
    }
    if (body.stops !== undefined) {
      routeUpdates["route.stops"] = body.stops;
      delete body.stops;
    }
    if (body.boardingStops !== undefined) {
      routeUpdates["route.boardingStops"] = body.boardingStops;
      delete body.boardingStops;
    }
    if (body.droppingStops !== undefined) {
      routeUpdates["route.droppingStops"] = body.droppingStops;
      delete body.droppingStops;
    }

    const updatePayload: any = { ...body, ...routeUpdates };

    // Fetch existing trip early so we can normalize against current values
    const existingTrip = await Trip.findById(req.params.id).lean();
    if (!existingTrip) return sendError(res, "Trip not found", 404);

    // Server-side normalization: if departureTime/recurrenceId are present but
    // equal to existing values (possible due to timezone/formatting differences),
    // remove them so they are not treated as changes.
    try {
      if (updatePayload.departureTime && existingTrip.departureTime) {
        const newDepMs = new Date(updatePayload.departureTime).getTime();
        const oldDepMs = new Date(existingTrip.departureTime).getTime();
        if (newDepMs === oldDepMs) delete updatePayload.departureTime;
      }
      if (
        updatePayload.recurrenceId !== undefined &&
        String(updatePayload.recurrenceId) ===
          String(existingTrip.recurrenceId ?? "")
      ) {
        delete updatePayload.recurrenceId;
      }
    } catch (e) {
      // ignore normalization errors
    }

    // DEBUG: log incoming update payload to help diagnose duplicate-check triggers
    try {
      console.debug(
        "[debug] trip:update payload:",
        JSON.stringify(updatePayload),
      );
    } catch (e) {}

    // Only validate recurrenceId + departureTime uniqueness when either
    // of those fields is being changed. This lets admins edit other fields
    // (stops, boarding/dropping points, fare, etc.) without false-positive
    // duplicate checks when the recurrence/time remain unchanged.

    const recurrenceChanging = Object.prototype.hasOwnProperty.call(
      updatePayload,
      "recurrenceId",
    );
    const departureChanging = Object.prototype.hasOwnProperty.call(
      updatePayload,
      "departureTime",
    );

    // Determine whether the values are actually changing (not just present in payload).
    let recurrenceChanged = false;
    if (recurrenceChanging) {
      recurrenceChanged =
        String(updatePayload.recurrenceId) !==
        String(existingTrip.recurrenceId ?? "");
    }

    let departureChanged = false;
    if (departureChanging) {
      try {
        const newDep = new Date(updatePayload.departureTime).getTime();
        const oldDep = existingTrip.departureTime
          ? new Date(existingTrip.departureTime).getTime()
          : null;
        departureChanged = oldDep === null ? true : newDep !== oldDep;
      } catch (e) {
        departureChanged = true;
      }
    }

    if (recurrenceChanged || departureChanged) {
      console.debug(
        `[debug] recurrenceChanged=${recurrenceChanged} departureChanged=${departureChanged}`,
      );
      const newRecurrence =
        (updatePayload.recurrenceId as any) || existingTrip.recurrenceId;
      const newDeparture =
        (updatePayload.departureTime as any) || existingTrip.departureTime;
      if (newRecurrence && newDeparture) {
        const conflict = await Trip.findOne({
          recurrenceId: newRecurrence,
          departureTime: new Date(newDeparture),
          _id: { $ne: req.params.id },
        }).select("_id recurrenceId departureTime");
        console.debug("[debug] conflict lookup for recurrence/time =>", {
          recurrence: newRecurrence,
          departure: newDeparture,
          conflictId: conflict?._id,
        });
        if (conflict) {
          return sendError(
            res,
            "Update conflicts with an existing trip (duplicate recurrence/time)",
            400,
          );
        }
      }
    }

    let trip: any = null;
    try {
      await Trip.findByIdAndUpdate(req.params.id, updatePayload, { new: true });
      trip = await Trip.findById(req.params.id).populate({
        path: "bus",
        select: "busName busNumber type amenities totalSeats",
        populate: { path: "operator", select: "name" },
      });
    } catch (err: any) {
      // Handle duplicate key error for unique recurrenceId+departureTime index
      if (err.code === 11000) {
        return sendError(
          res,
          "Update conflicts with an existing trip (duplicate recurrence/time)",
          400,
        );
      }
      console.error("Trip update error", err);
      return sendError(res, err?.message || "Failed to update trip", 500);
    }

    try {
      emitTripChanged(io, trip);
    } catch (err) {}

    sendSuccess(res, { trip }, "Trip updated");
  },
);

router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) {
    sendError(res, "Trip not found", 404);
    return;
  }

  const activeBooking = await Booking.findOne({
    trip: trip._id,
    bookingStatus: { $ne: "cancelled" },
    paymentStatus: { $in: ["paid", "pending"] },
  }).select("_id");

  if (activeBooking) {
    sendError(res, "Trip has bookings and cannot be deleted", 400);
    return;
  }

  await Trip.findByIdAndDelete(req.params.id);
  try {
    emitTripDeleted(io, req.params.id);
  } catch (err) {}
  sendSuccess(res, {}, "Trip deleted");
});

router.post("/batch-delete", protect, authorize("admin"), async (req, res) => {
  const ids: string[] = Array.isArray(req.body?.ids) ? req.body.ids : [];

  if (!ids.length) {
    sendError(res, "No trips selected", 400);
    return;
  }

  const trips = await Trip.find({ _id: { $in: ids } }).select("_id");
  if (!trips.length) {
    sendError(res, "Trips not found", 404);
    return;
  }

  const activeBooking = await Booking.findOne({
    trip: { $in: ids },
    bookingStatus: { $ne: "cancelled" },
    paymentStatus: { $in: ["paid", "pending"] },
  }).select("_id");

  if (activeBooking) {
    sendError(
      res,
      "One or more trips have bookings and cannot be deleted",
      400,
    );
    return;
  }

  await Trip.deleteMany({ _id: { $in: ids } });
  sendSuccess(res, { deletedCount: ids.length }, "Trips deleted");
});

export default router;
