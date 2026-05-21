import { Router } from 'express';
import { searchTrips, getTripById, getPopularRoutes } from '../controllers/trip.controller';
import { protect, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createTripSchema } from '../validators/trip.validator';
import { Trip } from '../models/Trip';
import { Bus } from '../models/Bus';
import { sendSuccess, sendError } from '../utils/apiResponse';

const router = Router();

router.get('/search', searchTrips);
router.get('/popular-routes', getPopularRoutes);
router.get('/:id', getTripById);

router.post('/', protect, authorize('admin', 'operator'), validate(createTripSchema), async (req: any, res) => {
  const { busId, from, to, stops, distance, departureTime, arrivalTime, fare } = req.body;

  const bus = await Bus.findById(busId);
  if (!bus) { sendError(res, 'Bus not found', 404); return; }

  const availableSeats = bus.seats.map(s => s.number);

  const trip = await Trip.create({
    bus: busId,
    route: { from, to, stops: stops || [], distance },
    departureTime,
    arrivalTime,
    fare,
    availableSeats,
    bookedSeats: [],
  });

  sendSuccess(res, { trip }, 'Trip created', 201);
});

router.patch('/:id', protect, authorize('admin', 'operator'), async (req, res) => {
  const trip = await Trip.findByIdAndUpdate(req.params.id, req.body, { new: true });
  sendSuccess(res, { trip }, 'Trip updated');
});

export default router;
