require("dotenv").config();
const { v4: uuidv4 } = require("uuid");
const { connectDB } = require("../dist/config/database");
const { User } = require("../dist/models/User");
const { Bus } = require("../dist/models/Bus");
const { Trip } = require("../dist/models/Trip");
const { RecurringSchedule } = require("../dist/models/RecurringSchedule");
const { generateToken } = require("../dist/utils/jwt");

(async () => {
  await connectDB();

  const admin = await User.findOne({ role: "admin" }).select("_id email role");
  const bus = await Bus.findOne().select("_id");
  if (!admin || !bus) {
    console.log(
      JSON.stringify({ ok: false, reason: "missing admin or bus" }, null, 2),
    );
    process.exit(1);
  }

  const token = generateToken({
    id: admin._id.toString(),
    role: admin.role,
    email: admin.email,
  });
  const payload = {
    title: "API Auto Generate Test",
    bus: bus._id.toString(),
    route: {
      from: "Dhaka",
      to: "Chittagong",
      distance: 265,
      stops: ["Comilla"],
    },
    daysOfWeek: [0, 3, 6],
    departureTime: "15:00",
    durationMinutes: 300,
    startDate: "2026-05-22",
    endDate: "2026-06-30",
    timezone: "Asia/Dhaka",
    meta: { fare: 1200 },
  };

  const createRes = await fetch("http://127.0.0.1:5002/api/admin/recurrings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const createText = await createRes.text();
  console.log(
    JSON.stringify(
      { step: "create", status: createRes.status, body: createText },
      null,
      2,
    ),
  );
  if (!createRes.ok) process.exit(1);

  const created = JSON.parse(createText).data.recurring;
  const recurrenceKey = created.recurrenceId;

  const afterCreateCount = await Trip.countDocuments({
    recurrenceId: recurrenceKey,
  });

  const applyRes = await fetch(
    `http://127.0.0.1:5002/api/admin/recurrings/${created._id}/apply?months=1`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  const applyText = await applyRes.text();
  console.log(
    JSON.stringify(
      { step: "apply", status: applyRes.status, body: applyText },
      null,
      2,
    ),
  );

  const afterApplyCount = await Trip.countDocuments({
    recurrenceId: recurrenceKey,
  });
  const sample = await Trip.findOne({ recurrenceId: recurrenceKey })
    .sort({ departureTime: 1 })
    .lean();

  console.log(
    JSON.stringify(
      {
        step: "verify",
        afterCreateCount,
        afterApplyCount,
        sample: sample
          ? {
              route: sample.route,
              departureTime: sample.departureTime,
              arrivalTime: sample.arrivalTime,
              fare: sample.fare,
              availableSeats: sample.availableSeats.length,
            }
          : null,
      },
      null,
      2,
    ),
  );

  await Trip.deleteMany({ recurrenceId: recurrenceKey });
  await RecurringSchedule.deleteOne({ recurrenceId: recurrenceKey });
  process.exit(0);
})().catch(async (error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exitCode = 1;
});
