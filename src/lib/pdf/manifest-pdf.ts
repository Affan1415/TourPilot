// Simple PDF generation for manifest using browser print
// For a more robust solution, consider @react-pdf/renderer or pdfkit

interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  waiverSigned: boolean;
  checkedIn: boolean;
}

interface Booking {
  id: string;
  bookingId: string;
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
  };
  guests: Guest[];
  notes: string | null;
  totalPrice: number;
}

interface ManifestTour {
  id: string;
  availabilityId: string;
  name: string;
  time: string;
  endTime: string;
  location: string;
  meetingPoint: string;
  capacity: number;
  bookings: Booking[];
}

export function generateManifestHTML(
  tours: ManifestTour[],
  date: string
): string {
  const totalGuests = tours.reduce(
    (acc, t) => acc + t.bookings.reduce((a, b) => a + b.guests.length, 0),
    0
  );
  const checkedIn = tours.reduce(
    (acc, t) =>
      acc + t.bookings.reduce((a, b) => a + b.guests.filter((g) => g.checkedIn).length, 0),
    0
  );
  const pendingWaivers = tours.reduce(
    (acc, t) =>
      acc + t.bookings.reduce((a, b) => a + b.guests.filter((g) => !g.waiverSigned).length, 0),
    0
  );

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Captain Manifest - ${date}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #1a1a1a;
      padding: 20px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #4f46e5;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .logo-icon {
      width: 40px;
      height: 40px;
      background: #4f46e5;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 20px;
    }
    .logo-text {
      font-size: 24px;
      font-weight: 700;
      color: #1a1a1a;
    }
    .header-info {
      text-align: right;
    }
    .header-info h1 {
      font-size: 20px;
      color: #4f46e5;
    }
    .header-info p {
      color: #666;
      font-size: 14px;
    }
    .summary {
      display: flex;
      gap: 24px;
      margin-bottom: 24px;
      padding: 16px;
      background: #f8fafc;
      border-radius: 8px;
    }
    .summary-item {
      text-align: center;
    }
    .summary-item .value {
      font-size: 28px;
      font-weight: 700;
      color: #4f46e5;
    }
    .summary-item .label {
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
    }
    .tour {
      margin-bottom: 24px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      page-break-inside: avoid;
    }
    .tour-header {
      background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
      color: white;
      padding: 16px;
    }
    .tour-name {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .tour-details {
      display: flex;
      gap: 16px;
      font-size: 12px;
      opacity: 0.9;
    }
    .tour-stats {
      display: flex;
      gap: 16px;
      padding: 12px 16px;
      background: #f1f5f9;
      font-size: 12px;
    }
    .tour-stats span {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .booking {
      padding: 12px 16px;
      border-bottom: 1px solid #e2e8f0;
    }
    .booking:last-child {
      border-bottom: none;
    }
    .booking-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
    }
    .booking-customer {
      font-weight: 600;
      font-size: 13px;
    }
    .booking-ref {
      font-family: monospace;
      font-size: 11px;
      color: #666;
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .booking-contact {
      font-size: 11px;
      color: #666;
      margin-bottom: 8px;
    }
    .booking-note {
      font-size: 11px;
      color: #4f46e5;
      font-style: italic;
      margin-bottom: 8px;
    }
    .guest-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .guest {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 11px;
      border: 1px solid;
    }
    .guest-pending {
      background: #fff7ed;
      border-color: #fed7aa;
      color: #c2410c;
    }
    .guest-ready {
      background: #fff;
      border-color: #e2e8f0;
      color: #1a1a1a;
    }
    .guest-checked {
      background: #f0fdf4;
      border-color: #bbf7d0;
      color: #166534;
    }
    .checkbox {
      width: 14px;
      height: 14px;
      border: 2px solid currentColor;
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .checkbox.checked {
      background: #22c55e;
      border-color: #22c55e;
      color: white;
    }
    .checkbox.checked::after {
      content: "✓";
      font-size: 10px;
    }
    .waiver-icon {
      font-size: 10px;
    }
    .footer {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 10px;
      color: #999;
    }
    @media print {
      body {
        padding: 0;
      }
      .tour {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">
      <div class="logo-icon">⚓</div>
      <span class="logo-text">TourPilot</span>
    </div>
    <div class="header-info">
      <h1>Captain Manifest</h1>
      <p>${date}</p>
    </div>
  </div>

  <div class="summary">
    <div class="summary-item">
      <div class="value">${tours.length}</div>
      <div class="label">Tours</div>
    </div>
    <div class="summary-item">
      <div class="value">${totalGuests}</div>
      <div class="label">Total Guests</div>
    </div>
    <div class="summary-item">
      <div class="value">${checkedIn}</div>
      <div class="label">Checked In</div>
    </div>
    <div class="summary-item">
      <div class="value">${pendingWaivers}</div>
      <div class="label">Pending Waivers</div>
    </div>
  </div>

  ${tours
    .map((tour) => {
      const tourGuests = tour.bookings.reduce((a, b) => a + b.guests.length, 0);
      const tourChecked = tour.bookings.reduce(
        (a, b) => a + b.guests.filter((g) => g.checkedIn).length,
        0
      );

      return `
    <div class="tour">
      <div class="tour-header">
        <div class="tour-name">${tour.name}</div>
        <div class="tour-details">
          <span>🕐 ${tour.time} - ${tour.endTime}</span>
          <span>📍 ${tour.meetingPoint}</span>
        </div>
      </div>
      <div class="tour-stats">
        <span>👥 ${tourChecked}/${tourGuests} checked in</span>
        <span>📊 ${tourGuests}/${tour.capacity} capacity</span>
      </div>
      ${tour.bookings
        .map(
          (booking) => `
        <div class="booking">
          <div class="booking-header">
            <span class="booking-customer">${booking.customer.firstName} ${booking.customer.lastName}</span>
            <span class="booking-ref">${booking.id}</span>
          </div>
          <div class="booking-contact">
            📧 ${booking.customer.email} ${booking.customer.phone ? `• 📞 ${booking.customer.phone}` : ""}
          </div>
          ${booking.notes ? `<div class="booking-note">Note: ${booking.notes}</div>` : ""}
          <div class="guest-list">
            ${booking.guests
              .map(
                (guest) => `
              <div class="guest ${guest.checkedIn ? "guest-checked" : guest.waiverSigned ? "guest-ready" : "guest-pending"}">
                <div class="checkbox ${guest.checkedIn ? "checked" : ""}"></div>
                <span>${guest.firstName} ${guest.lastName}</span>
                ${!guest.waiverSigned ? '<span class="waiver-icon">⚠️</span>' : ""}
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      `
        )
        .join("")}
    </div>
  `;
    })
    .join("")}

  <div class="footer">
    Generated by TourPilot • ${new Date().toLocaleString()}
  </div>
</body>
</html>
  `;
}

export function printManifest(tours: ManifestTour[], date: string) {
  const html = generateManifestHTML(tours, date);
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}

export function downloadManifestPDF(tours: ManifestTour[], date: string) {
  // For now, open print dialog which allows "Save as PDF"
  // For true PDF generation, integrate a library like jsPDF or @react-pdf/renderer
  printManifest(tours, date);
}
