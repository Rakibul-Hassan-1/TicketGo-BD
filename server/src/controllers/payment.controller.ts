import { Request, Response } from 'express';
import SSLCommerzPayment from 'sslcommerz-lts';
import { Booking } from '../models/Booking';
import { Trip } from '../models/Trip';
import { User } from '../models/User';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { AuthRequest } from '../middleware/auth';
import { unlockSeat } from '../config/redis';
import { io } from '../index';
import { emitSeatUnlocked } from '../config/socket';
import { sendEmail, bookingConfirmationTemplate } from '../utils/email';
import { generateTicketPDF } from '../services/pdf.service';

const store_id = process.env.SSLCZ_STORE_ID || '';
const store_passwd = process.env.SSLCZ_STORE_PASS || '';
const is_live = process.env.SSLCZ_IS_LIVE === 'true';

export const initiatePayment = async (req: AuthRequest, res: Response): Promise<void> => {
  const { bookingId } = req.body;
  const userId = req.user!.id;

  const booking = await Booking.findOne({ bookingId, user: userId }).populate('trip');
  if (!booking) { sendError(res, 'Booking not found', 404); return; }
  if (booking.paymentStatus !== 'pending') {
    sendError(res, 'Payment already processed', 400); return;
  }

  const user = await User.findById(userId);
  const trip = booking.trip as any;

  const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);

  const data = {
    total_amount: booking.totalAmount,
    currency: 'BDT',
    tran_id: booking.bookingId,
    success_url: `${process.env.BACKEND_URL}/api/payment/success`,
    fail_url: `${process.env.BACKEND_URL}/api/payment/fail`,
    cancel_url: `${process.env.BACKEND_URL}/api/payment/cancel`,
    ipn_url: `${process.env.BACKEND_URL}/api/payment/ipn`,
    shipping_method: 'NO',
    product_name: `Bus Ticket: ${trip.route.from} → ${trip.route.to}`,
    product_category: 'Travel',
    product_profile: 'general',
    cus_name: user?.name || 'Customer',
    cus_email: user?.email || '',
    cus_add1: 'Bangladesh',
    cus_city: trip.route.from,
    cus_country: 'Bangladesh',
    cus_phone: user?.phone || '01700000000',
  };

  const apiResponse = await sslcz.init(data);
  if (apiResponse?.GatewayPageURL) {
    booking.sslczSessionKey = apiResponse.sessionkey;
    await booking.save();
    sendSuccess(res, { url: apiResponse.GatewayPageURL }, 'Payment initiated');
  } else {
    sendError(res, 'Payment gateway error', 500);
  }
};

export const paymentSuccess = async (req: Request, res: Response): Promise<void> => {
  const { tran_id, val_id } = req.body;

  const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
  const validation = await sslcz.validate({ val_id });

  if (validation?.status !== 'VALID' && validation?.status !== 'VALIDATED') {
    res.redirect(`${process.env.FRONTEND_URL}/booking/failed`);
    return;
  }

  const booking = await Booking.findOne({ bookingId: tran_id }).populate('trip user');
  if (!booking) { res.redirect(`${process.env.FRONTEND_URL}/booking/failed`); return; }

  booking.paymentStatus = 'paid';
  booking.bookingStatus = 'confirmed';
  booking.transactionId = val_id;
  await booking.save();

  const trip = booking.trip as any;
  await Trip.findByIdAndUpdate(trip._id, {
    $pull: { availableSeats: { $in: booking.seats } },
    $push: { bookedSeats: { $each: booking.seats } },
  });

  for (const seat of booking.seats) {
    await unlockSeat(trip._id.toString(), seat).catch(() => {});
  }
  emitSeatUnlocked(io, trip._id.toString(), booking.seats);

  // Generate PDF & send email
  try {
    const user = booking.user as any;
    const ticketPdfPath = await generateTicketPDF(booking, trip, user);
    booking.ticketUrl = ticketPdfPath;
    await booking.save();

    await sendEmail({
      to: user.email,
      subject: `Booking Confirmed — ${booking.bookingId}`,
      html: bookingConfirmationTemplate({
        name: user.name,
        bookingId: booking.bookingId,
        from: trip.route.from,
        to: trip.route.to,
        departureTime: new Date(trip.departureTime).toLocaleString('en-BD'),
        seats: booking.seats,
        totalAmount: booking.totalAmount,
      }),
      attachments: [{ filename: `ticket-${booking.bookingId}.pdf`, path: ticketPdfPath }],
    });
  } catch (err) {
    console.error('Post-payment task error:', err);
  }

  res.redirect(`${process.env.FRONTEND_URL}/booking/success?id=${booking.bookingId}`);
};

export const paymentFail = async (req: Request, res: Response): Promise<void> => {
  const { tran_id } = req.body;
  await Booking.findOneAndUpdate(
    { bookingId: tran_id },
    { paymentStatus: 'failed' },
  );
  res.redirect(`${process.env.FRONTEND_URL}/booking/failed?id=${tran_id}`);
};

export const paymentCancel = async (req: Request, res: Response): Promise<void> => {
  const { tran_id } = req.body;
  res.redirect(`${process.env.FRONTEND_URL}/booking/failed?id=${tran_id}&reason=cancelled`);
};
