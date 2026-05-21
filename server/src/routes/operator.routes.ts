import { Router } from 'express';
import { protect, authorize, AuthRequest } from '../middleware/auth';
import { Trip } from '../models/Trip';
import { Booking } from '../models/Booking';
import { Bus } from '../models/Bus';
import { sendSuccess } from '../utils/apiResponse';

const router = Router();
router.use(protect, authorize('operator', 'admin'));

router.get('/my-buses', async (req: AuthRequest, res) => {
  const buses = await Bus.find({ operator: req.user!.id, isActive: true });
  sendSuccess(res, { buses });
});

router.get('/my-trips', async (req: AuthRequest, res) => {
  const buses = await Bus.find({ operator: req.user!.id }).select('_id');
  const busIds = buses.map(b => b._id);
  const trips = await Trip.find({ bus: { $in: busIds } })
    .populate('bus', 'busName type')
    .sort({ departureTime: -1 });
  sendSuccess(res, { trips });
});

router.get('/revenue', async (req: AuthRequest, res) => {
  const buses = await Bus.find({ operator: req.user!.id }).select('_id');
  const busIds = buses.map(b => b._id);
  const trips = await Trip.find({ bus: { $in: busIds } }).select('_id');
  const tripIds = trips.map(t => t._id);

  const bookings = await Booking.find({
    trip: { $in: tripIds },
    paymentStatus: 'paid',
  }).select('totalAmount createdAt');

  const totalRevenue = bookings.reduce((sum, b) => sum + b.totalAmount, 0);
  sendSuccess(res, { totalRevenue, totalBookings: bookings.length, bookings });
});

export default router;
