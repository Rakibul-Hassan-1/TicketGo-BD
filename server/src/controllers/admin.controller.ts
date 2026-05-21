import { Request, Response } from 'express';
import { User } from '../models/User';
import { Bus } from '../models/Bus';
import { Trip } from '../models/Trip';
import { Booking } from '../models/Booking';
import { sendSuccess } from '../utils/apiResponse';

export const getDashboardStats = async (_req: Request, res: Response): Promise<void> => {
  const [totalUsers, totalBuses, totalTrips, bookings] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    Bus.countDocuments({ isActive: true }),
    Trip.countDocuments({ status: 'scheduled' }),
    Booking.find({ paymentStatus: 'paid' }).select('totalAmount createdAt'),
  ]);

  const totalRevenue = bookings.reduce((sum, b) => sum + b.totalAmount, 0);

  const recentBookings = await Booking.find()
    .populate('user', 'name email')
    .populate({ path: 'trip', select: 'route departureTime' })
    .sort({ createdAt: -1 })
    .limit(10);

  sendSuccess(res, {
    stats: { totalUsers, totalBuses, totalTrips, totalRevenue, totalBookings: bookings.length },
    recentBookings,
  });
};

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  const { page = 1, limit = 20, role } = req.query;
  const filter = role ? { role } : {};
  const users = await User.find(filter)
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .sort({ createdAt: -1 });
  const total = await User.countDocuments(filter);
  sendSuccess(res, { users, total, page: Number(page), limit: Number(limit) });
};

export const getAllBookings = async (req: Request, res: Response): Promise<void> => {
  const { page = 1, limit = 20, status } = req.query;
  const filter = status ? { bookingStatus: status } : {};
  const bookings = await Booking.find(filter)
    .populate('user', 'name email phone')
    .populate({ path: 'trip', populate: { path: 'bus', select: 'busName type' } })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .sort({ createdAt: -1 });
  const total = await Booking.countDocuments(filter);
  sendSuccess(res, { bookings, total });
};

export const toggleUserStatus = async (req: Request, res: Response): Promise<void> => {
  const user = await User.findById(req.params.id);
  if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
  user.isActive = !user.isActive;
  await user.save();
  sendSuccess(res, { user }, `User ${user.isActive ? 'activated' : 'deactivated'}`);
};
