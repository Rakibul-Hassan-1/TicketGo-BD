import path from "path";

const normalizeBaseUrl = (value: string | undefined): string | null => {
  const normalized = value?.trim().replace(/\/+$/, "");
  return normalized ? normalized : null;
};

export const getBackendBaseUrl = (): string => {
  return (
    normalizeBaseUrl(process.env.BACKEND_URL) ||
    normalizeBaseUrl(process.env.RENDER_EXTERNAL_URL) ||
    "http://localhost:5000"
  );
};

export const getTicketDownloadUrl = (bookingId: string): string => {
  return `${getBackendBaseUrl()}/api/payment/tickets/${bookingId}`;
};

export const getTicketFilePath = (bookingId: string): string => {
  return path.join(
    process.cwd(),
    "uploads",
    "tickets",
    `ticket-${bookingId}.pdf`,
  );
};
