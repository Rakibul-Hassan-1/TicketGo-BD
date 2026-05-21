import mongoose, { Document, Schema } from 'mongoose';

export interface IRoute {
  from: string;
  to: string;
  distance: number;
  stops: string[];
}

export interface ITrip extends Document {
  bus: mongoose.Types.ObjectId;
  route: IRoute;
  departureTime: Date;
  arrivalTime: Date;
  fare: number;
  availableSeats: string[];
  bookedSeats: string[];
  status: 'scheduled' | 'departed' | 'arrived' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const routeSchema = new Schema<IRoute>({
  from: { type: String, required: true },
  to: { type: String, required: true },
  distance: { type: Number, required: true },
  stops: [{ type: String }],
}, { _id: false });

const tripSchema = new Schema<ITrip>({
  bus: { type: Schema.Types.ObjectId, ref: 'Bus', required: true },
  route: { type: routeSchema, required: true },
  departureTime: { type: Date, required: true },
  arrivalTime: { type: Date, required: true },
  fare: { type: Number, required: true, min: 0 },
  availableSeats: [{ type: String }],
  bookedSeats: [{ type: String }],
  status: {
    type: String,
    enum: ['scheduled', 'departed', 'arrived', 'cancelled'],
    default: 'scheduled',
  },
}, { timestamps: true });

tripSchema.index({ 'route.from': 1, 'route.to': 1, departureTime: 1 });

export const Trip = mongoose.model<ITrip>('Trip', tripSchema);
