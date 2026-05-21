import { v4 as uuidv4 } from 'uuid';

export const generateBookingId = (): string => {
  const prefix = 'TGB';
  const unique = uuidv4().replace(/-/g, '').slice(0, 10).toUpperCase();
  return `${prefix}-${unique}`;
};
