import { DateTime } from "luxon";
import cron from "node-cron";
import { RRule } from "rrule";
import { Bus } from "../models/Bus";
import { RecurringSchedule } from "../models/RecurringSchedule";
import { Trip } from "../models/Trip";

function buildWindow(
  schedule: { startDate: Date; endDate?: Date },
  windowDays: number,
) {
  const now = DateTime.utc().startOf("day");
  const start = DateTime.max(
    now,
    DateTime.fromJSDate(schedule.startDate, { zone: "utc" }).startOf("day"),
  );
  const fallbackEnd = now.plus({ days: windowDays }).endOf("day");
  const end = schedule.endDate
    ? DateTime.min(
        fallbackEnd,
        DateTime.fromJSDate(schedule.endDate, { zone: "utc" }).endOf("day"),
      )
    : fallbackEnd;
  return { start, end };
}

function getOccurrences(
  schedule: { rrule?: string; daysOfWeek?: number[] },
  windowStart: any,
  windowEnd: any,
) {
  let dates: Date[] = [];
  if (schedule.rrule) {
    try {
      const rule = RRule.fromString(schedule.rrule);
      dates = rule.between(windowStart.toJSDate(), windowEnd.toJSDate(), true);
    } catch {
      dates = [];
    }
  } else if (schedule.daysOfWeek && schedule.daysOfWeek.length) {
    let cursor = windowStart;
    while (cursor <= windowEnd) {
      const weekday = cursor.weekday % 7;
      if (schedule.daysOfWeek.includes(weekday)) {
        dates.push(cursor.toJSDate());
      }
      cursor = cursor.plus({ days: 1 });
    }
  }
  return dates;
}

function buildTripPayload(sched: any, bus: any, departUTC: any) {
  const seatLayout = bus?.seats?.map((seat: any) => seat.number) || [];
  const arrival = sched.durationMinutes
    ? departUTC.plus({ minutes: sched.durationMinutes }).toJSDate()
    : departUTC.plus({ hours: 5 }).toJSDate();

  return {
    bus: sched.bus,
    route: {
      from: sched.route.from,
      to: sched.route.to,
      distance: sched.route.distance,
      stops: sched.route.stops || [],
      boardingStops:
        sched.route.boardingStops ||
        (sched.route.stops || []).slice(
          0,
          Math.ceil((sched.route.stops || []).length / 2),
        ),
      droppingStops:
        sched.route.droppingStops ||
        (sched.route.stops || []).slice(
          Math.ceil((sched.route.stops || []).length / 2),
        ),
    },
    departureTime: departUTC.toJSDate(),
    arrivalTime: arrival,
    fare: sched.meta?.fare ?? 0,
    availableSeats: seatLayout,
    bookedSeats: [],
    recurrenceId: sched.recurrenceId,
  };
}

// Generate occurrences for next N days (default 30)
export async function generateForWindow(windowDays = 30) {
  const schedules = await RecurringSchedule.find({ enabled: true });
  for (const s of schedules) {
    const { start, end } = buildWindow(s, windowDays);
    const dates = getOccurrences(s, start, end);

    const bus = await Bus.findById(s.bus);
    for (const d of dates) {
      const dt = DateTime.fromJSDate(d, { zone: s.timezone });
      const [hh, mm] = s.departureTime.split(":").map((n) => parseInt(n, 10));
      const departLocal = dt.set({
        hour: hh || 0,
        minute: mm || 0,
        second: 0,
        millisecond: 0,
      });
      const departUTC = departLocal.toUTC();
      await Trip.updateOne(
        { recurrenceId: s.recurrenceId, departureTime: departUTC.toJSDate() },
        { $setOnInsert: buildTripPayload(s, bus, departUTC) },
        { upsert: true },
      );
    }
  }
}

export function startRecurrenceGenerator() {
  // run once daily at 00:05 UTC
  cron.schedule("5 0 * * *", async () => {
    try {
      await generateForWindow(30);
      console.log("Recurrence generator run completed");
    } catch (err) {
      console.error("Recurrence generator error", err);
    }
  });
}

export async function generateForSchedule(scheduleId: string, windowDays = 30) {
  const s = await RecurringSchedule.findById(scheduleId);
  if (!s || !s.enabled) return;
  const { start, end } = buildWindow(s, windowDays);
  const dates = getOccurrences(s, start, end);
  const bus = await Bus.findById(s.bus);
  for (const d of dates) {
    const dt = DateTime.fromJSDate(d, { zone: s.timezone });
    const [hh, mm] = s.departureTime.split(":").map((n) => parseInt(n, 10));
    const departLocal = dt.set({
      hour: hh || 0,
      minute: mm || 0,
      second: 0,
      millisecond: 0,
    });
    const departUTC = departLocal.toUTC();
    await Trip.updateOne(
      { recurrenceId: s.recurrenceId, departureTime: departUTC.toJSDate() },
      { $setOnInsert: buildTripPayload(s, bus, departUTC) },
      { upsert: true },
    );
  }
}

export async function syncRecurringSchedule(
  scheduleId: string,
  windowDays = 30,
) {
  const s = await RecurringSchedule.findById(scheduleId);
  if (!s) return;

  const cutoff = DateTime.utc().toJSDate();
  await Trip.deleteMany({
    recurrenceId: s.recurrenceId,
    departureTime: { $gte: cutoff },
  });

  if (!s.enabled) return;
  await generateForSchedule(scheduleId, windowDays);
}
