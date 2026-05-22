import mongoose, { Document, Schema } from "mongoose";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type BookingStatus = "pending" | "hold" | "confirmed" | "cancelled";

export interface IPassenger {
  name: string;
  age: number;
  gender: "male" | "female" | "other";
  seatNumber: string;
}

export interface IBooking extends Document {
  bookingId: string;
  user: mongoose.Types.ObjectId;
  trip: mongoose.Types.ObjectId;
  passengers: IPassenger[];
  seats: string[];
  totalAmount: number;
  paymentStatus: PaymentStatus;
  bookingStatus: BookingStatus;
  transactionId?: string;
  sslczSessionKey?: string;
  ticketUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const passengerSchema = new Schema<IPassenger>(
  {
    name: { type: String, required: true },
    age: { type: Number, required: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    seatNumber: { type: String, required: true },
  },
  { _id: false },
);

const bookingSchema = new Schema<IBooking>(
  {
    bookingId: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    trip: { type: Schema.Types.ObjectId, ref: "Trip", required: true },
    passengers: [passengerSchema],
    seats: [{ type: String }],
    totalAmount: { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    bookingStatus: {
      type: String,
      enum: ["pending", "hold", "confirmed", "cancelled"],
      default: "pending",
    },
    transactionId: { type: String },
    sslczSessionKey: { type: String },
    ticketUrl: { type: String },
  },
  { timestamps: true },
);

export const Booking = mongoose.model<IBooking>("Booking", bookingSchema);
