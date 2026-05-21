import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: nodemailer.SendMailOptions['attachments'];
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  await transporter.sendMail({
    from: `"TicketGo BD" <${process.env.EMAIL_USER}>`,
    ...options,
  });
};

export const bookingConfirmationTemplate = (data: {
  name: string;
  bookingId: string;
  from: string;
  to: string;
  departureTime: string;
  seats: string[];
  totalAmount: number;
}): string => `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
    <div style="background:#2563EB;padding:20px;border-radius:8px 8px 0 0;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:22px">TicketGo BD</h1>
      <p style="color:#BFDBFE;margin:4px 0 0">Booking Confirmation</p>
    </div>
    <div style="background:#F8FAFC;padding:24px;border:1px solid #E2E8F0;border-top:none">
      <p style="color:#374151">Hi <strong>${data.name}</strong>,</p>
      <p style="color:#374151">Your booking has been confirmed! 🎉</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;color:#6B7280;border-bottom:1px solid #E5E7EB">Booking ID</td>
            <td style="padding:8px;font-weight:600;border-bottom:1px solid #E5E7EB">${data.bookingId}</td></tr>
        <tr><td style="padding:8px;color:#6B7280;border-bottom:1px solid #E5E7EB">Route</td>
            <td style="padding:8px;font-weight:600;border-bottom:1px solid #E5E7EB">${data.from} → ${data.to}</td></tr>
        <tr><td style="padding:8px;color:#6B7280;border-bottom:1px solid #E5E7EB">Departure</td>
            <td style="padding:8px;font-weight:600;border-bottom:1px solid #E5E7EB">${data.departureTime}</td></tr>
        <tr><td style="padding:8px;color:#6B7280;border-bottom:1px solid #E5E7EB">Seats</td>
            <td style="padding:8px;font-weight:600;border-bottom:1px solid #E5E7EB">${data.seats.join(', ')}</td></tr>
        <tr><td style="padding:8px;color:#6B7280">Total Paid</td>
            <td style="padding:8px;font-weight:600;color:#16A34A">৳${data.totalAmount}</td></tr>
      </table>
      <p style="color:#6B7280;font-size:13px">Your e-ticket is attached to this email. Please carry it during your journey.</p>
    </div>
    <div style="background:#1E3A5F;padding:12px;border-radius:0 0 8px 8px;text-align:center">
      <p style="color:#93C5FD;margin:0;font-size:12px">© 2025 TicketGo BD — Book Your Journey Instantly</p>
    </div>
  </div>
`;
