import dotenv from "dotenv";
import mongoose from "mongoose";
import { Trip } from "../models/Trip";

dotenv.config();

async function migrate() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set");
  await mongoose.connect(uri);
  console.log("Connected to MongoDB — starting migration");

  const cursor = Trip.find({}).cursor();
  let count = 0;
  for await (const doc of cursor) {
    const trip: any = doc.toObject();
    const stops: string[] = trip.route?.stops || [];
    const boarding =
      trip.route?.boardingStops || stops.slice(0, Math.ceil(stops.length / 2));
    const dropping =
      trip.route?.droppingStops || stops.slice(Math.ceil(stops.length / 2));

    await Trip.findByIdAndUpdate(trip._id, {
      $set: {
        "route.boardingStops": boarding,
        "route.droppingStops": dropping,
      },
    });
    count++;
  }

  console.log(`Migration finished — updated ${count} trips`);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
