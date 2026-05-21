import mongoose, { Document, Schema } from 'mongoose';

export type BusType = 'AC' | 'Non-AC' | 'Sleeper' | 'Semi-Sleeper';

export interface ISeat {
  number: string;
  type: 'window' | 'aisle';
  deck: 'lower' | 'upper';
}

export interface IBus extends Document {
  busName: string;
  busNumber: string;
  type: BusType;
  totalSeats: number;
  seats: ISeat[];
  operator: mongoose.Types.ObjectId;
  amenities: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const seatSchema = new Schema<ISeat>({
  number: { type: String, required: true },
  type: { type: String, enum: ['window', 'aisle'], required: true },
  deck: { type: String, enum: ['lower', 'upper'], default: 'lower' },
}, { _id: false });

const busSchema = new Schema<IBus>({
  busName: { type: String, required: true, trim: true },
  busNumber: { type: String, required: true, unique: true, trim: true },
  type: { type: String, enum: ['AC', 'Non-AC', 'Sleeper', 'Semi-Sleeper'], required: true },
  totalSeats: { type: Number, required: true, min: 1, max: 80 },
  seats: [seatSchema],
  operator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amenities: [{ type: String }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const Bus = mongoose.model<IBus>('Bus', busSchema);
