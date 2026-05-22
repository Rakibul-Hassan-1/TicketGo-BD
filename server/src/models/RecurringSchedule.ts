import mongoose, { Document, Schema } from "mongoose";

export interface IRecurringSchedule extends Document {
  title: string;
  bus: mongoose.Types.ObjectId;
  route: {
    from: string;
    to: string;
    distance: number;
    stops?: string[];
  };
  rrule?: string; // optional RFC5545 rule
  daysOfWeek?: number[]; // 0=Sun..6=Sat (simple fallback)
  departureTime: string; // HH:mm
  durationMinutes?: number;
  startDate: Date;
  endDate?: Date;
  timezone: string; // e.g. Asia/Dhaka
  enabled: boolean;
  recurrenceId: string; // uuid
  meta?: any;
}

const routeSchema = new Schema(
  {
    from: { type: String, required: true },
    to: { type: String, required: true },
    distance: { type: Number, required: true, min: 0 },
    stops: [{ type: String }],
  },
  { _id: false },
);

const recurringSchema = new Schema<IRecurringSchedule>(
  {
    title: { type: String, required: true },
    bus: { type: Schema.Types.ObjectId, ref: "Bus", required: true },
    route: { type: routeSchema, required: true },
    rrule: { type: String },
    daysOfWeek: [{ type: Number }],
    departureTime: { type: String, required: true },
    durationMinutes: { type: Number },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    timezone: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    recurrenceId: { type: String, required: true, unique: true },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

export const RecurringSchedule = mongoose.model<IRecurringSchedule>(
  "RecurringSchedule",
  recurringSchema,
);
