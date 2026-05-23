import dotenv from "dotenv";
import mongoose from "mongoose";
import { Bus } from "../models/Bus";
import { Trip } from "../models/Trip";

dotenv.config();

async function main() {
  const uri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    "mongodb://localhost:27017/test";
  await mongoose.connect(uri);

  const bus = await Bus.findOne({ isActive: true }).lean();
  if (!bus) {
    console.error("No active bus found in DB");
    process.exit(1);
  }

  const now = new Date();
  const dep = new Date(now.getTime() + 24 * 60 * 60 * 1000); // tomorrow
  const arr = new Date(dep.getTime() + 4 * 60 * 60 * 1000);

  try {
    const created = await Trip.create({
      bus: bus._id,
      route: {
        from: "Dhaka",
        to: "Chittagong",
        distance: 250,
        stops: ["Dhaka", "Cumilla", "Chittagong"],
        boardingStops: ["Dhaka"],
        droppingStops: ["Chittagong"],
      },
      departureTime: dep,
      arrivalTime: arr,
      fare: 700,
      availableSeats: (bus as any).seats
        ? (bus as any).seats.map((s: any) => s.number)
        : [],
      bookedSeats: [],
    });

    console.log("Created trip:", created._id.toString());
  } catch (err: any) {
    console.error("Create failed:", err.message || err);
    if (err.code === 11000) console.error("Duplicate key error", err.keyValue);
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
