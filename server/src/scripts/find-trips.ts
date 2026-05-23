import dotenv from "dotenv";
import mongoose from "mongoose";
import { Trip } from "../models/Trip";

dotenv.config();

async function main() {
  const from = process.argv[2];
  const to = process.argv[3];
  const dateStr = process.argv[4];
  if (!from || !to || !dateStr) {
    console.error(
      "Usage: ts-node src/scripts/find-trips.ts <from> <to> <YYYY-MM-DD>",
    );
    process.exit(1);
  }

  const uri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    "mongodb://localhost:27017/test";
  await mongoose.connect(uri);

  const start = new Date(dateStr);
  start.setHours(0, 0, 0, 0);
  const end = new Date(dateStr);
  end.setHours(23, 59, 59, 999);

  const trips = await Trip.find({
    "route.from": { $regex: new RegExp(from, "i") },
    "route.to": { $regex: new RegExp(to, "i") },
    departureTime: { $gte: start, $lte: end },
    status: "scheduled",
  })
    .populate({ path: "bus", select: "busName busNumber type" })
    .sort({ departureTime: 1 })
    .lean();

  console.log(`Found ${trips.length} trips for ${from} -> ${to} on ${dateStr}`);
  for (const t of trips) {
    console.log({
      id: t._id.toString(),
      bus: (t as any).bus?.busName,
      busNumber: (t as any).bus?.busNumber,
      from: t.route?.from,
      to: t.route?.to,
      stops: t.route?.stops,
      boardingStops: t.route?.boardingStops,
      droppingStops: t.route?.droppingStops,
      departureTime: t.departureTime,
      fare: t.fare,
      recurrenceId: t.recurrenceId,
    });
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
