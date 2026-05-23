import dotenv from "dotenv";
import mongoose from "mongoose";
import { Trip } from "../models/Trip";

dotenv.config();

async function main() {
  const id = process.argv[2];
  const payloadJson = process.argv[3] || "{}";
  if (!id) {
    console.error(
      "Usage: ts-node src/scripts/check-trip-update.ts <tripId> '<payloadJson>'",
    );
    process.exit(1);
  }

  const uri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    "mongodb://localhost:27017/test";
  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  const existingTrip = await Trip.findById(id).lean();
  if (!existingTrip) {
    console.error("Trip not found", id);
    process.exit(1);
  }

  const payload = JSON.parse(payloadJson);

  const updatePayload = { ...payload };

  // Normalize route fields similar to route handler
  if (payload.from !== undefined) updatePayload["route.from"] = payload.from;
  if (payload.to !== undefined) updatePayload["route.to"] = payload.to;
  if (payload.distance !== undefined)
    updatePayload["route.distance"] = payload.distance;
  if (payload.stops !== undefined) updatePayload["route.stops"] = payload.stops;
  if (payload.boardingStops !== undefined)
    updatePayload["route.boardingStops"] = payload.boardingStops;
  if (payload.droppingStops !== undefined)
    updatePayload["route.droppingStops"] = payload.droppingStops;

  const recurrenceChanging = Object.prototype.hasOwnProperty.call(
    updatePayload,
    "recurrenceId",
  );
  const departureChanging = Object.prototype.hasOwnProperty.call(
    updatePayload,
    "departureTime",
  );

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

  console.log({
    recurrenceChanging,
    departureChanging,
    recurrenceChanged,
    departureChanged,
  });

  if (recurrenceChanged || departureChanged) {
    const newRecurrence =
      updatePayload.recurrenceId || existingTrip.recurrenceId;
    const newDeparture =
      updatePayload.departureTime || existingTrip.departureTime;
    if (newRecurrence && newDeparture) {
      const conflict = await Trip.findOne({
        recurrenceId: newRecurrence,
        departureTime: new Date(newDeparture),
        _id: { $ne: id },
      }).select("_id");
      console.log("Conflict found:", !!conflict, conflict?._id);
    } else {
      console.log(
        "Not enough data to check conflict (missing recurrence or departure)",
      );
    }
  } else {
    console.log(
      "Recurrence/departure not changed — no uniqueness check will run",
    );
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
