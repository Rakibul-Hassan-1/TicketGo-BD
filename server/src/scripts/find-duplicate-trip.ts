import dotenv from "dotenv";
import mongoose from "mongoose";
import { Trip } from "../models/Trip";

dotenv.config();

async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error("Usage: ts-node src/scripts/find-duplicate-trip.ts <tripId>");
    process.exit(1);
  }

  const uri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    "mongodb://localhost:27017/test";
  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  const trip = await Trip.findById(id).lean();
  if (!trip) {
    console.error("Trip not found", id);
    process.exit(1);
  }

  console.log(
    "Trip recurrenceId:",
    trip.recurrenceId,
    "departureTime:",
    trip.departureTime,
  );

  if (!trip.recurrenceId) {
    console.log(
      "This trip has no recurrenceId — no duplicate by recurrence/time.",
    );
  } else {
    const dup = await Trip.find({
      recurrenceId: trip.recurrenceId,
      departureTime: new Date(trip.departureTime),
      _id: { $ne: id },
    }).select("_id route departureTime recurrenceId");
    console.log("Found duplicates:", dup.length);
    dup.forEach((d) => console.log(d));
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
