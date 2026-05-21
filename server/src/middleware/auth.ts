import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';
import { sendError } from '../utils/apiResponse';
import { User } from '../models/User';

export interface AuthRequest extends Request {
  user?: JwtPayload & { _id: string };
}

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    sendError(res, 'Not authenticated', 401);
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) {
      sendError(res, 'User not found or deactivated', 401);
      return;
    }
    req.user = { ...decoded, _id: user._id.toString() };
    next();
  } catch {
    sendError(res, 'Invalid or expired token', 401);
  }
};

export const authorize = (...roles: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      sendError(res, 'Not authorized for this action', 403);
      return;
    }
    next();
  };
