import path from "path";

const normalizeBaseUrl = (
  value: string | undefined,
  fallback: string,
): string => (value || fallback).replace(/\/+$/, "");

export const backendBaseUrl = normalizeBaseUrl(
  process.env.BACKEND_URL,
  "http://localhost:5000",
);

export const getTicketFileName = (bookingId: string): string =>
  `ticket-${bookingId}.pdf`;

export const getTicketFilePath = (bookingId: string): string =>
  path.join(process.cwd(), "uploads", "tickets", getTicketFileName(bookingId));

export const getTicketDownloadUrl = (bookingId: string): string =>
  `${backendBaseUrl}/api/payment/tickets/${encodeURIComponent(bookingId)}`;