import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";

const TICKETS_DIR = path.join(process.cwd(), "uploads", "tickets");

const COLORS = {
  primary: "#1E3A5F",
  dark: "#0F172A",
  accent: "#F0A500",
  success: "#2E7D32",
  successBg: "#E8F5E9",
  successBorder: "#A5D6A7",
  light: "#F8FAFC",
  border: "#E2E8F0",
  muted: "#64748B",
  text: "#0F172A",
  notesBg: "#FFFBEB",
  notesBorder: "#FCD34D",
  white: "#FFFFFF",
  tableBg: "#1E3A5F",
  tableHeaderText: "#FFFFFF",
  seatBg: "#1E3A5F",
  seatText: "#FFFFFF",
};

const normalizeText = (value: any, fallback = "N/A"): string => {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
};

const sanitizeText = (v: any) => {
  const s = normalizeText(v, "");
  return (
    s
      .replace(/[\x00-\x1F\x7F]/g, " ")
      .replace(/([%#@\^&*_-])\1{2,}/g, "$1$1")
      .trim() || "N/A"
  );
};

const formatDate = (value: any): string => {
  if (!value) return "N/A";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("en-BD", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatTime = (value: any): string => {
  if (!value) return "N/A";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "N/A";
  return d.toLocaleTimeString("en-BD", { hour: "numeric", minute: "2-digit" });
};

const drawRoundedRect = (
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  stroke?: string,
): void => {
  doc.roundedRect(x, y, w, h, r).fillAndStroke(fill, stroke || fill);
};

// All text drawn with lineBreak:false to prevent PDFKit from creating new pages
const txt = (
  doc: PDFKit.PDFDocument,
  content: string,
  x: number,
  y: number,
  opts: Record<string, any> = {},
): void => {
  doc.text(content, x, y, { lineBreak: false, ...opts });
};

const sectionLabel = (
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  maxW: number,
): void => {
  doc.fillColor(COLORS.muted).font("Helvetica-Bold").fontSize(7.5);
  txt(doc, text.toUpperCase(), x, y, {
    width: maxW,
    characterSpacing: 0.6,
    lineBreak: false,
  });
};

/**
 * Generates a professional e-ticket PDF for a bus booking
 * @param booking - Booking object containing booking details
 * @param trip - Trip object containing route and bus information
 * @param user - User object containing passenger details
 * @returns Promise resolving to the file path of generated PDF
 */
export const generateTicketPDF = async (
  booking: any,
  trip: any,
  user: any,
): Promise<string> => {
  try {
    if (!fs.existsSync(TICKETS_DIR)) {
      fs.mkdirSync(TICKETS_DIR, { recursive: true });
    }

    const bookingId = normalizeText(booking?.bookingId, "TGB-UNKNOWN");
    const filename = `ticket-${bookingId}.pdf`;
    const filePath = path.join(TICKETS_DIR, filename);

    return new Promise((resolve, reject) => {
      try {
        // autoFirstPage:true, but we manage all positioning manually
        // bufferPages:true lets us draw footer after knowing total layout
        const doc = new PDFDocument({
          size: "A4",
          margin: 0,
          autoFirstPage: true,
          bufferPages: true,
        });
        const stream = fs.createWriteStream(filePath);

        stream.on("error", (err) => {
          console.error("Stream error:", err);
          reject(err);
        });

        doc.on("error", (err) => {
          console.error("Document error:", err);
          reject(err);
        });

        doc.pipe(stream);

        const pageW = doc.page.width; // 595.28
        const pageH = doc.page.height; // 841.89
        const margin = 40;
        const contentW = pageW - margin * 2;
        const footerH = 32;
        // Reserve bottom space so content never enters footer zone
        const usableBottom = pageH - footerH - 8;

        // ==================== HEADER ====================
        const headerH = 68;
        doc.rect(0, 0, pageW, headerH).fill(COLORS.primary);

        doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(21);
        txt(doc, "Ticket Go BD", margin, 18);

        doc.fillColor("#94B4D1").font("Helvetica").fontSize(9);
        txt(doc, "Smart Travel Solutions", margin, 41);

        // Amber E-TICKET badge
        const badgeW = 70;
        const badgeH = 20;
        const badgeX = pageW - margin - badgeW;
        drawRoundedRect(
          doc,
          badgeX,
          23,
          badgeW,
          badgeH,
          10,
          COLORS.accent,
          COLORS.accent,
        );
        doc.fillColor(COLORS.dark).font("Helvetica-Bold").fontSize(8);
        txt(doc, "E-TICKET", badgeX, 29, { width: badgeW, align: "center" });

        let y = headerH + 10;

        // ==================== BOOKING STATUS BANNER ====================
        const bannerH = 46;
        drawRoundedRect(
          doc,
          margin,
          y,
          contentW,
          bannerH,
          6,
          COLORS.successBg,
          COLORS.successBorder,
        );
        doc.rect(margin, y, 4, bannerH).fill(COLORS.success);

        doc.fillColor(COLORS.success).font("Helvetica-Bold").fontSize(12);
        txt(doc, "Booking Confirmed", margin + 14, y + 8);

        doc.fillColor(COLORS.muted).font("Helvetica").fontSize(8);
        txt(
          doc,
          "Your ticket has been issued and is ready to use",
          margin + 14,
          y + 25,
        );

        // Booking ID right-aligned
        doc.fillColor(COLORS.muted).font("Helvetica").fontSize(7.5);
        txt(doc, "Booking ID:", pageW - margin - 200, y + 12, {
          width: 76,
          align: "right",
        });
        doc.fillColor(COLORS.primary).font("Helvetica-Bold").fontSize(8.5);
        txt(doc, sanitizeText(bookingId), pageW - margin - 120, y + 12, {
          width: 110,
          align: "right",
        });

        y += bannerH + 10;

        // ==================== ROUTE SECTION ====================
        const routeH = 98;
        drawRoundedRect(
          doc,
          margin,
          y,
          contentW,
          routeH,
          6,
          COLORS.white,
          COLORS.border,
        );

        sectionLabel(doc, "Your Journey", margin + 12, y + 8, 120);

        const fromCity = sanitizeText(
          trip?.route?.from || trip?.route?.origin || "Origin",
        );
        const toCity = sanitizeText(
          trip?.route?.to || trip?.route?.destination || "Destination",
        );
        const depDate = formatDate(trip?.departureTime);
        const arrDate = formatDate(trip?.arrivalTime);
        const depTime = formatTime(trip?.departureTime);
        const arrTime = formatTime(trip?.arrivalTime);

        const cityBoxW = (contentW - 56) / 2;
        const cityBoxY = y + 22;
        const cityBoxH = 64;

        // Left city box
        drawRoundedRect(
          doc,
          margin + 10,
          cityBoxY,
          cityBoxW,
          cityBoxH,
          5,
          COLORS.light,
          COLORS.border,
        );
        // Right city box
        drawRoundedRect(
          doc,
          margin + contentW - cityBoxW - 10,
          cityBoxY,
          cityBoxW,
          cityBoxH,
          5,
          COLORS.light,
          COLORS.border,
        );

        const lx = margin + 18;
        const rx = margin + contentW - cityBoxW - 2;

        // Departure
        doc.fillColor(COLORS.muted).font("Helvetica-Bold").fontSize(6.5);
        txt(doc, "DEPARTURE", lx, cityBoxY + 7, { characterSpacing: 0.5 });
        doc.fillColor(COLORS.text).font("Helvetica-Bold").fontSize(16);
        txt(doc, fromCity, lx, cityBoxY + 18, { width: cityBoxW - 20 });
        doc.fillColor(COLORS.primary).font("Helvetica-Bold").fontSize(11);
        txt(doc, depTime, lx, cityBoxY + 39);
        doc.fillColor(COLORS.muted).font("Helvetica").fontSize(7.5);
        txt(doc, depDate, lx, cityBoxY + 53);

        // Arrow + "TO" label center between boxes
        // Helvetica lacks unicode arrow glyph, use a PDFKit line + ">" instead
        const arrowX = margin + 10 + cityBoxW;
        const arrowW = 36;
        const arrowMidY = cityBoxY + 33;
        doc
          .moveTo(arrowX + 2, arrowMidY)
          .lineTo(arrowX + arrowW - 6, arrowMidY)
          .strokeColor(COLORS.muted)
          .lineWidth(1)
          .stroke();
        doc.fillColor(COLORS.muted).font("Helvetica-Bold").fontSize(9);
        txt(doc, ">", arrowX + arrowW - 10, arrowMidY - 5);
        doc.fillColor(COLORS.muted).font("Helvetica-Bold").fontSize(6.5);
        txt(doc, "TO", arrowX, cityBoxY + 42, {
          width: arrowW,
          align: "center",
          characterSpacing: 1,
        });

        // Arrival
        doc.fillColor(COLORS.muted).font("Helvetica-Bold").fontSize(6.5);
        txt(doc, "ARRIVAL", rx + 8, cityBoxY + 7, { characterSpacing: 0.5 });
        doc.fillColor(COLORS.text).font("Helvetica-Bold").fontSize(16);
        txt(doc, toCity, rx + 8, cityBoxY + 18, { width: cityBoxW - 20 });
        doc.fillColor(COLORS.primary).font("Helvetica-Bold").fontSize(11);
        txt(doc, arrTime, rx + 8, cityBoxY + 39);
        doc.fillColor(COLORS.muted).font("Helvetica").fontSize(7.5);
        txt(doc, arrDate, rx + 8, cityBoxY + 53);

        y += routeH + 10;

        // ==================== BUS INFO BOX ====================
        // Pre-calculate seat pills height so we know box size
        const passengers = Array.isArray(booking?.passengers)
          ? booking.passengers
          : [];
        const seats = Array.isArray(booking?.seats)
          ? booking.seats
          : passengers.map((p: any) => p?.seatNumber).filter(Boolean);

        const busName = sanitizeText(trip?.bus?.busName ?? "N/A");
        const busNumber = sanitizeText(trip?.bus?.busNumber ?? "N/A");
        const busType = sanitizeText(trip?.bus?.type ?? "N/A");

        // Measure seat pills to get real height
        const pillH = 16;
        const pillGap = 5;
        const seatStartX = margin + 12;
        const seatMaxX = margin + contentW - 12;
        let seatCurX = seatStartX;
        let seatRows = 1;
        doc.font("Helvetica-Bold").fontSize(7.5);
        seats.forEach((s: any) => {
          const txt2 = String(s).trim();
          if (!txt2) return;
          const pw = Math.max(32, doc.widthOfString(txt2) + 14);
          if (seatCurX + pw > seatMaxX) {
            seatRows++;
            seatCurX = seatStartX;
          }
          seatCurX += pw + pillGap;
        });
        const seatBlockH = seatRows * (pillH + 4);

        const busBoxH = 32 + seatBlockH + 16; // label area + pills + padding
        drawRoundedRect(
          doc,
          margin,
          y,
          contentW,
          busBoxH,
          6,
          COLORS.white,
          COLORS.border,
        );
        // Top accent stripe
        doc.rect(margin, y, contentW, 3).fill(COLORS.primary);

        // Three columns
        const c1 = margin + 12;
        const c2 = margin + 180;
        const c3 = margin + 350;

        doc.fillColor(COLORS.muted).font("Helvetica").fontSize(7);
        txt(doc, "Bus Name", c1, y + 8);
        txt(doc, "Bus Number", c2, y + 8);
        txt(doc, "Bus Type", c3, y + 8);

        doc.fillColor(COLORS.text).font("Helvetica-Bold").fontSize(9.5);
        txt(doc, busName, c1, y + 19, { width: 160 });
        txt(doc, busNumber, c2, y + 19, { width: 160 });
        txt(doc, busType, c3, y + 19, { width: 110 });

        // Seat pills
        doc.fillColor(COLORS.muted).font("Helvetica-Bold").fontSize(7);
        txt(doc, "YOUR SEATS", c1, y + 35, { characterSpacing: 0.5 });

        let spx = c1 + 78;
        let spy = y + 32;
        doc.font("Helvetica-Bold").fontSize(7.5);
        seats.forEach((s: any) => {
          const label = String(s).trim();
          if (!label) return;
          const pw = Math.max(32, doc.widthOfString(label) + 14);
          if (spx + pw > seatMaxX) {
            spx = seatStartX;
            spy += pillH + 4;
          }
          drawRoundedRect(
            doc,
            spx,
            spy,
            pw,
            pillH,
            3,
            COLORS.seatBg,
            COLORS.seatBg,
          );
          doc.fillColor(COLORS.seatText).font("Helvetica-Bold").fontSize(7.5);
          txt(doc, label, spx + 4, spy + 4, { width: pw - 8, align: "center" });
          spx += pw + pillGap;
        });

        y += busBoxH + 10;

        // ==================== PASSENGER TABLE ====================
        const colWidths = [36, 264, 56, 78, 82];
        const hdrH = 24;

        drawRoundedRect(
          doc,
          margin,
          y,
          contentW,
          hdrH,
          5,
          COLORS.tableBg,
          COLORS.tableBg,
        );

        let colX = margin;
        ["No.", "Name", "Age", "Gender", "Seat"].forEach((h, i) => {
          doc
            .fillColor(COLORS.tableHeaderText)
            .font("Helvetica-Bold")
            .fontSize(8);
          txt(doc, h, colX + 6, y + 8, {
            width: colWidths[i] - 12,
            align: i === 1 ? "left" : "center",
          });
          colX += colWidths[i];
        });

        y += hdrH;

        const rows =
          passengers.length > 0
            ? passengers
            : [
                {
                  name: user?.name,
                  age: user?.age,
                  gender: user?.gender,
                  seatNumber: seats[0] || "N/A",
                },
              ];

        const rowH = 20;

        rows.forEach((p: any, idx: number) => {
          const rowY = y + idx * rowH;
          doc
            .rect(margin, rowY, contentW, rowH)
            .fill(idx % 2 === 0 ? COLORS.light : COLORS.white);
          // Bottom border
          doc
            .moveTo(margin, rowY + rowH)
            .lineTo(margin + contentW, rowY + rowH)
            .strokeColor(COLORS.border)
            .lineWidth(0.4)
            .stroke();

          let cx = margin;
          const vals = [
            String(idx + 1),
            sanitizeText(p?.name ?? "N/A"),
            sanitizeText(p?.age ?? "N/A"),
            sanitizeText(p?.gender ?? "N/A"),
            sanitizeText(p?.seatNumber || seats[idx] || "N/A"),
          ];
          vals.forEach((v, i) => {
            const color = i === 4 ? COLORS.primary : COLORS.text;
            doc
              .fillColor(color)
              .font(i === 0 || i === 4 ? "Helvetica-Bold" : "Helvetica")
              .fontSize(8.5);
            txt(doc, v, cx + 6, rowY + 5, {
              width: colWidths[i] - 12,
              align: i === 1 ? "left" : "center",
            });
            cx += colWidths[i];
          });
        });

        y += Math.max(rows.length, 1) * rowH + 10;

        // ==================== PAYMENT & NOTES ROW ====================
        const leftW = contentW * 0.58 - 8;
        const rightW = contentW * 0.42 - 8;
        const leftX = margin;
        const rightX = margin + leftW + 16;

        const farePerSeat = Number(trip?.fare ?? 0);
        const seatCount = seats.length || 1;
        const totalAmount = Number(
          booking?.totalAmount ?? farePerSeat * seatCount,
        );
        const txn = sanitizeText(booking?.transactionId ?? "N/A");

        const payRows = [
          ["Fare per seat", `BDT ${farePerSeat.toFixed(2)}`],
          ["Number of seats", String(seatCount)],
          ["Transaction ID", txn],
          ["Payment method", "SSLCommerz"],
        ];
        const payBodyH = payRows.length * 17;
        const totalRowH = 26;
        const payBoxH = 22 + payBodyH + totalRowH; // label + rows + total

        // Notes box — same height as pay box
        const noteLines = [
          "Arrive 30 min before departure",
          "Carry valid ID and this ticket",
          "Ticket is non-transferable",
          "No refund after boarding",
          "Contact: support@Ticket Go BD.com",
        ];
        const notesH = payBoxH;

        // Barcode height
        const barcodeH = 50;

        // Payment box
        drawRoundedRect(
          doc,
          leftX,
          y,
          leftW,
          payBoxH,
          6,
          COLORS.white,
          COLORS.border,
        );
        doc.rect(leftX, y, leftW, 3).fill(COLORS.primary);
        sectionLabel(doc, "Payment Summary", leftX + 12, y + 8, leftW - 24);

        payRows.forEach((pv, i) => {
          const ry = y + 22 + i * 17;
          if (i > 0) {
            doc
              .moveTo(leftX + 12, ry - 2)
              .lineTo(leftX + leftW - 12, ry - 2)
              .strokeColor(COLORS.border)
              .lineWidth(0.3)
              .stroke();
          }
          doc.fillColor(COLORS.muted).font("Helvetica").fontSize(7.5);
          txt(doc, pv[0], leftX + 12, ry);
          doc.fillColor(COLORS.text).font("Helvetica-Bold").fontSize(8);
          txt(doc, pv[1], leftX + 12, ry, {
            width: leftW - 24,
            align: "right",
          });
        });

        // Total row — navy bg
        const totalY = y + payBoxH - totalRowH;
        doc.rect(leftX, totalY, leftW, totalRowH).fill(COLORS.primary);
        doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(9);
        txt(doc, "Total Amount", leftX + 12, totalY + 8);
        doc.fillColor(COLORS.accent).font("Helvetica-Bold").fontSize(12);
        txt(doc, `BDT ${totalAmount.toFixed(2)}`, leftX + 12, totalY + 7, {
          width: leftW - 24,
          align: "right",
        });

        // Notes box
        drawRoundedRect(
          doc,
          rightX,
          y,
          rightW,
          notesH,
          6,
          COLORS.notesBg,
          COLORS.notesBorder,
        );
        sectionLabel(doc, "Important Info", rightX + 10, y + 8, rightW - 20);
        noteLines.forEach((n, i) => {
          doc.fillColor("#78350F").font("Helvetica").fontSize(7.5);
          txt(doc, `\u2022 ${n}`, rightX + 10, y + 22 + i * 14, {
            width: rightW - 20,
          });
        });

        // Barcode below notes (right column)
        const barcodeY = y + notesH + 8;
        drawRoundedRect(
          doc,
          rightX,
          barcodeY,
          rightW,
          barcodeH,
          6,
          COLORS.white,
          COLORS.border,
        );
        sectionLabel(
          doc,
          "Scan to Verify",
          rightX + 10,
          barcodeY + 7,
          rightW - 20,
        );
        doc.fillColor(COLORS.dark).font("Helvetica-Bold").fontSize(11);
        txt(
          doc,
          "||||||  |||  |||||  |||  ||||||",
          rightX + 10,
          barcodeY + 20,
          { width: rightW - 20, align: "center" },
        );
        doc.fillColor(COLORS.primary).font("Helvetica-Bold").fontSize(7);
        txt(doc, bookingId, rightX + 10, barcodeY + 36, {
          width: rightW - 20,
          align: "center",
        });

        // ==================== FOOTER ====================
        // Always pinned to the very bottom of the page
        const footerY = pageH - footerH;
        doc.rect(0, footerY, pageW, footerH).fill(COLORS.dark);

        doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(9);
        txt(doc, "Ticket Go BD · Smart Travel Solutions", margin, footerY + 8, {
          width: contentW,
          align: "center",
        });

        doc.fillColor("#94A3B8").font("Helvetica").fontSize(7.5);
        txt(
          doc,
          "www.ticketgobd.vercel.app |  support@ticketgobd.com  |  +880 1700-000000",
          margin,
          footerY + 22,
          { width: contentW, align: "center" },
        );

        doc.end();

        stream.on("finish", () => {
          console.log(`\u2713 Ticket generated: ${filePath}`);
          resolve(filePath);
        });

        stream.on("error", (err) => {
          console.error("Stream finish error:", err);
          reject(err);
        });
      } catch (err) {
        console.error("PDF generation error:", err);
        reject(err);
      }
    });
  } catch (err) {
    console.error("Ticket generation failed:", err);
    throw err;
  }
};
