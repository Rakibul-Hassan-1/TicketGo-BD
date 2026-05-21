import { Router } from 'express';
import { lockSeats, createBooking, getUserBookings, getBookingById, cancelBooking } from '../controllers/booking.controller';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createBookingSchema, lockSeatsSchema } from '../validators/booking.validator';

const router = Router();

router.use(protect);
router.post('/lock-seats', validate(lockSeatsSchema), lockSeats);
router.post('/', validate(createBookingSchema), createBooking);
router.get('/', getUserBookings);
router.get('/:id', getBookingById);
router.patch('/:id/cancel', cancelBooking);

export default router;
