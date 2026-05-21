import { Response } from 'express';

export const sendSuccess = (
  res: Response,
  data: any,
  message = 'Success',
  statusCode = 200,
): void => {
  res.status(statusCode).json({ success: true, message, data });
};

export const sendError = (
  res: Response,
  message = 'Something went wrong',
  statusCode = 500,
  errors?: any,
): void => {
  res.status(statusCode).json({ success: false, message, errors });
};
