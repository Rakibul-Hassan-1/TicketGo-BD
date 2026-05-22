import { Request, Response } from "express";
import SSLCommerzPayment from "sslcommerz-lts";
import { unlockSeat } from "../config/redis";
import { emitSeatUnlocked, emitSeatsBooked } from "../config/socket";
import { io } from "../index";
import { AuthRequest } from "../middleware/auth";
import { Booking } from "../models/Booking";
import { Trip } from "../models/Trip";
import { User } from "../models/User";
import { generateTicketPDF } from "../services/pdf.service";
import { sendError, sendSuccess } from "../utils/apiResponse";
import { bookingConfirmationTemplate, sendEmail } from "../utils/email";

const normalizeBaseUrl = (
  value: string | undefined,
  fallback: string,
): string => (value || fallback).replace(/\/+$/, "");

const store_id = process.env.SSLCZ_STORE_ID || "";
const store_passwd = process.env.SSLCZ_STORE_PASS || "";
const is_live = process.env.SSLCZ_IS_LIVE === "true";
const backendUrl = normalizeBaseUrl(
  process.env.BACKEND_URL,
  "http://localhost:5000",
);
const frontendUrl = normalizeBaseUrl(
  process.env.FRONTEND_URL,
  "http://localhost:3000",
);

const requirePaymentEnv = (): string | null => {
  if (!store_id) return "SSLCZ_STORE_ID is not configured";
  if (!store_passwd) return "SSLCZ_STORE_PASS is not configured";
  if (!process.env.BACKEND_URL) return "BACKEND_URL is not configured";
  if (!process.env.FRONTEND_URL) return "FRONTEND_URL is not configured";
  return null;
};

export const finalizeBookingApproval = async (
  bookingId: string,
): Promise<void> => {
  const booking = await Booking.findOne({ bookingId }).populate("trip user");
  if (!booking) {
    throw new Error("Booking not found");
  }

  if (booking.paymentStatus !== "paid") {
    throw new Error("Only paid bookings can be approved");
  }

  if (booking.bookingStatus === "confirmed" && booking.ticketUrl) {
    return;
  }

  booking.bookingStatus = "confirmed";
  await booking.save();

  const trip = booking.trip as any;

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
        departureTime: new Date(trip.departureTime).toLocaleString("en-BD"),
        seats: booking.seats,
        totalAmount: booking.totalAmount,
      }),
      attachments: [
        { filename: `ticket-${booking.bookingId}.pdf`, path: ticketPdfPath },
      ],
    });
  } catch (err) {
    console.error("Post-approval task error:", err);
  }
};

export const initiatePayment = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const configError = requirePaymentEnv();
    if (configError) {
      sendError(res, configError, 500);
      return;
    }

    const { bookingId } = req.body;
    const userId = req.user!.id;

    const booking = await Booking.findOne({ bookingId, user: userId }).populate(
      "trip",
    );
    if (!booking) {
      sendError(res, "Booking not found", 404);
      return;
    }
    if (booking.paymentStatus !== "pending") {
      sendError(res, "Payment already processed", 400);
      return;
    }

    const user = await User.findById(userId);
    const trip = booking.trip as any;

    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);

    const data = {
      total_amount: booking.totalAmount,
      currency: "BDT",
      tran_id: booking.bookingId,
      success_url: `${backendUrl}/api/payment/success`,
      fail_url: `${backendUrl}/api/payment/fail`,
      cancel_url: `${backendUrl}/api/payment/cancel`,
      ipn_url: `${backendUrl}/api/payment/ipn`,
      shipping_method: "NO",
      product_name: `Bus Ticket: ${trip.route.from} → ${trip.route.to}`,
      product_category: "Travel",
      product_profile: "general",
      cus_name: user?.name || "Customer",
      cus_email: user?.email || "",
      cus_add1: "Bangladesh",
      cus_city: trip.route.from,
      cus_country: "Bangladesh",
      cus_phone: user?.phone || "01700000000",
    };

    const apiResponse = await sslcz.init(data);
    const gatewayUrl =
      apiResponse?.GatewayPageURL || (apiResponse as any)?.redirectGatewayURL;

    if (gatewayUrl) {
      booking.sslczSessionKey = apiResponse.sessionkey;
      await booking.save();
      sendSuccess(res, { url: gatewayUrl }, "Payment initiated");
      return;
    }

    console.error("SSLCommerz init response missing gateway URL:", apiResponse);
    sendError(res, "Payment gateway error", 500);
  } catch (error) {
    console.error("Payment initiation error:", error);
    sendError(res, "Payment initiation failed", 500);
  }
};

export const paymentSuccess = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { tran_id, val_id } = req.body;
    if (!tran_id || !val_id) {
      res.redirect(`${frontendUrl}/booking/failed`);
      return;
    }

    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
    const validation = await sslcz.validate({ val_id });

    if (validation?.status !== "VALID" && validation?.status !== "VALIDATED") {
      res.redirect(`${frontendUrl}/booking/failed?id=${tran_id}`);
      return;
    }

    const booking = await Booking.findOne({ bookingId: tran_id }).populate(
      "trip user",
    );
    if (!booking) {
      res.redirect(`${frontendUrl}/booking/failed?id=${tran_id}`);
      return;
    }

    if (booking.paymentStatus === "paid") {
      res.redirect(
        `${frontendUrl}/booking/success?id=${booking.bookingId}&status=${booking.bookingStatus}`,
      );
      return;
    }

    booking.paymentStatus = "paid";
    booking.bookingStatus = "hold";
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
    // Notify clients that these seats are now booked and should be shown as booked
    emitSeatsBooked(io, trip._id.toString(), booking.seats);
    // Also notify to remove any temporary locks
    emitSeatUnlocked(io, trip._id.toString(), booking.seats);

    res.redirect(
      `${frontendUrl}/booking/success?id=${booking.bookingId}&status=hold`,
    );
  } catch (error) {
    console.error("Payment success callback error:", error);
    res.redirect(`${frontendUrl}/booking/failed`);
  }
};

export const paymentFail = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { tran_id } = req.body;
    await Booking.findOneAndUpdate(
      { bookingId: tran_id },
      { paymentStatus: "failed" },
    );
    res.redirect(`${frontendUrl}/booking/failed?id=${tran_id}`);
  } catch (error) {
    console.error("Payment fail callback error:", error);
    res.redirect(`${frontendUrl}/booking/failed`);
  }
};

export const paymentCancel = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { tran_id } = req.body;
    res.redirect(
      `${frontendUrl}/booking/failed?id=${tran_id}&reason=cancelled`,
    );
  } catch (error) {
    console.error("Payment cancel callback error:", error);
    res.redirect(`${frontendUrl}/booking/failed`);
  }
};

export const paymentIpn = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  res.status(200).json({ success: true });
};
