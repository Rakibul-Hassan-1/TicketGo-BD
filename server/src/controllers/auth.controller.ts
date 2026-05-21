import { Request, Response } from 'express';
import { User } from '../models/User';
import { generateToken } from '../utils/jwt';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { AuthRequest } from '../middleware/auth';

export const register = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, phone, role } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    sendError(res, 'Email already registered', 400);
    return;
  }

  const user = await User.create({ name, email, password, phone, role: role || 'user' });
  const token = generateToken({ id: user._id.toString(), role: user.role, email: user.email });

  sendSuccess(res, { user, token }, 'Registration successful', 201);
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    sendError(res, 'Invalid email or password', 401);
    return;
  }

  if (!user.isActive) {
    sendError(res, 'Account has been deactivated', 403);
    return;
  }

  const token = generateToken({ id: user._id.toString(), role: user.role, email: user.email });
  const userData = user.toJSON();

  sendSuccess(res, { user: userData, token }, 'Login successful');
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await User.findById(req.user?.id);
  if (!user) {
    sendError(res, 'User not found', 404);
    return;
  }
  sendSuccess(res, { user });
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await User.findByIdAndUpdate(
    req.user?.id,
    { $set: req.body },
    { new: true, runValidators: true },
  );
  sendSuccess(res, { user }, 'Profile updated');
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user?.id).select('+password');
  if (!user || !(await user.comparePassword(currentPassword))) {
    sendError(res, 'Current password is incorrect', 400);
    return;
  }
  user.password = newPassword;
  await user.save();
  sendSuccess(res, {}, 'Password changed successfully');
};
