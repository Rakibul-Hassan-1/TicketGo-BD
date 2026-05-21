import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const TICKETS_DIR = path.join(process.cwd(), 'uploads', 'tickets');

export const generateTicketPDF = async (
  booking: any,
  trip: any,
  user: any,
): Promise<string> => {
  if (!fs.existsSync(TICKETS_DIR)) {
    fs.mkdirSync(TICKETS_DIR, { recursive: true });
  }

  const filename = `ticket-${booking.bookingId}.pdf`;
  const filePath = path.join(TICKETS_DIR, filename);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    // Header
    doc.rect(0, 0, doc.page.width, 80).fill('#2563EB');
    doc.fillColor('#FFFFFF').fontSize(24).font('Helvetica-Bold')
      .text('TicketGo BD', 50, 25);
    doc.fontSize(10).font('Helvetica')
      .text('Book Your Journey Instantly', 50, 55);

    // Booking ID
    doc.fillColor('#1E3A5F').rect(50, 100, doc.page.width - 100, 40).fill('#EFF6FF');
    doc.fillColor('#2563EB').fontSize(12).font('Helvetica-Bold')
      .text(`Booking ID: ${booking.bookingId}`, 60, 115);

    // Route info
    doc.fillColor('#111827').fontSize(20).font('Helvetica-Bold')
      .text(`${trip.route.from}  →  ${trip.route.to}`, 50, 165);

    // Details table
    const tableTop = 210;
    const details = [
      ['Passenger', user.name],
      ['Phone', user.phone],
      ['Departure', new Date(trip.departureTime).toLocaleString('en-BD')],
      ['Arrival', new Date(trip.arrivalTime).toLocaleString('en-BD')],
      ['Seats', booking.seats.join(', ')],
      ['Amount Paid', `BDT ${booking.totalAmount}`],
      ['Status', booking.bookingStatus.toUpperCase()],
      ['Transaction ID', booking.transactionId || 'N/A'],
    ];

    details.forEach(([label, value], i) => {
      const y = tableTop + i * 28;
      doc.rect(50, y, 200, 24).fill(i % 2 === 0 ? '#F9FAFB' : '#FFFFFF');
      doc.rect(250, y, 295, 24).fill(i % 2 === 0 ? '#F9FAFB' : '#FFFFFF');
      doc.fillColor('#6B7280').fontSize(10).font('Helvetica').text(label, 60, y + 7);
      doc.fillColor('#111827').fontSize(10).font('Helvetica-Bold').text(value, 260, y + 7);
    });

    // Passengers section
    if (booking.passengers?.length > 0) {
      const passTop = tableTop + details.length * 28 + 30;
      doc.fillColor('#111827').fontSize(13).font('Helvetica-Bold')
        .text('Passengers', 50, passTop);

      booking.passengers.forEach((p: any, i: number) => {
        const y = passTop + 25 + i * 22;
        doc.fillColor('#374151').fontSize(10).font('Helvetica')
          .text(`${i + 1}. ${p.name} — Seat ${p.seatNumber} — Age ${p.age} — ${p.gender}`, 50, y);
      });
    }

    // Footer
    doc.rect(0, doc.page.height - 60, doc.page.width, 60).fill('#0F172A');
    doc.fillColor('#94A3B8').fontSize(9).font('Helvetica')
      .text(
        'This is a valid e-ticket. Please carry a copy (digital or printed) during your journey.',
        50, doc.page.height - 45,
        { width: doc.page.width - 100, align: 'center' },
      );

    doc.end();
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
};
