require("dotenv").config();
const { v4: uuidv4 } = require("uuid");
const { connectDB } = require("../dist/config/database");
const { Bus } = require("../dist/models/Bus");
const { Trip } = require("../dist/models/Trip");
const { RecurringSchedule } = require("../dist/models/RecurringSchedule");
const { generateForSchedule } = require("../dist/jobs/recurrence.job");

(async () => {
  await connectDB();

  const bus = await Bus.findOne();
  if (!bus) {
    console.log(JSON.stringify({ ok: false, reason: "no bus found" }));
    process.exit(0);
  }

  const recurrenceId = uuidv4();
  const schedule = await RecurringSchedule.create({
    title: "Integration Test Weekly",
    bus: bus._id,
    route: {
      from: "Dhaka",
      to: "Chittagong",
      distance: 265,
      stops: ["Comilla"],
    },
    daysOfWeek: [0, 3, 6],
    departureTime: "15:00",
    durationMinutes: 300,
    startDate: new Date("2026-05-22T00:00:00.000Z"),
    endDate: new Date("2026-06-30T00:00:00.000Z"),
    timezone: "Asia/Dhaka",
    enabled: true,
    recurrenceId,
    meta: { fare: 1200 },
  });

  try {
    const beforeCount = await Trip.countDocuments({ recurrenceId });
    await generateForSchedule(schedule._id.toString(), 30);
    const trips = await Trip.find({ recurrenceId }).sort({ departureTime: 1 });

    console.log(
      JSON.stringify(
        {
          ok: true,
          beforeCount,
          afterCount: trips.length,
          sample: trips[0]
            ? {
                route: trips[0].route,
                departureTime: trips[0].departureTime,
                arrivalTime: trips[0].arrivalTime,
                fare: trips[0].fare,
                availableSeats: trips[0].availableSeats.length,
              }
            : null,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
    process.exitCode = 1;
  } finally {
    await Trip.deleteMany({ recurrenceId });
    await RecurringSchedule.deleteOne({ _id: schedule._id });
  }
})().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exitCode = 1;
});
