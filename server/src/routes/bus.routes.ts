import { Router } from 'express';
import { Bus } from '../models/Bus';
import { protect, authorize } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/apiResponse';

const router = Router();

router.get('/', async (_req, res) => {
  const buses = await Bus.find({ isActive: true }).populate('operator', 'name');
  sendSuccess(res, { buses });
});

router.get('/:id', async (req, res) => {
  const bus = await Bus.findById(req.params.id).populate('operator', 'name phone');
  if (!bus) { sendError(res, 'Bus not found', 404); return; }
  sendSuccess(res, { bus });
});

router.post('/', protect, authorize('admin', 'operator'), async (req: any, res) => {
  const bus = await Bus.create({ ...req.body, operator: req.user.id });
  sendSuccess(res, { bus }, 'Bus created', 201);
});

router.patch('/:id', protect, authorize('admin', 'operator'), async (req: any, res) => {
  const bus = await Bus.findByIdAndUpdate(req.params.id, req.body, { new: true });
  sendSuccess(res, { bus }, 'Bus updated');
});

router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  await Bus.findByIdAndUpdate(req.params.id, { isActive: false });
  sendSuccess(res, {}, 'Bus deactivated');
});

export default router;
