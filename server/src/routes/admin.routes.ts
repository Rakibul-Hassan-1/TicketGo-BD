import { Router } from 'express';
import { getDashboardStats, getAllUsers, getAllBookings, toggleUserStatus } from '../controllers/admin.controller';
import { protect, authorize } from '../middleware/auth';
import { User } from '../models/User';
import { sendSuccess, sendError } from '../utils/apiResponse';

const router = Router();
router.use(protect, authorize('admin'));

router.get('/dashboard', getDashboardStats);
router.get('/users', getAllUsers);
router.get('/bookings', getAllBookings);

// Toggle status + optional role change
router.patch('/users/:id/toggle-status', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) { sendError(res, 'User not found', 404); return; }

  // If role provided in body, update role only
  if (req.body.role) {
    user.role = req.body.role;
  } else {
    // Otherwise toggle active status
    user.isActive = !user.isActive;
  }

  await user.save();
  sendSuccess(res, { user }, 'User updated');
});

export default router;
