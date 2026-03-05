# TourPilot - FareHarbor Clone

A modern, sleek booking system for tours and activities built with Next.js 14 and Supabase. Save 6-8% on booking fees by owning your platform!

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e)

## Features

### Public Booking System
- **Tour Listings** - Beautiful tour cards with images, pricing, ratings
- **Tour Details** - Full descriptions, image gallery, availability calendar
- **Booking Flow** - Multi-step checkout with guest management
- **Date & Time Selection** - Real-time availability with capacity tracking

### Digital Waiver System
- **Electronic Signatures** - Sign waivers on any device
- **Color-Coded Status** - Green (signed), Orange (partial), Red (pending)
- **Email Notifications** - Automatic waiver links sent to guests
- **Secure Storage** - Signatures stored in Supabase Storage

### Captain's Manifest (Attendance Sheet)
- **Daily View** - See all tours and guests for any date
- **Check-in System** - One-tap guest check-in
- **Waiver Status** - Visual indicators for waiver compliance
- **Printable** - Print-friendly manifest for offline use
- **Walk-up Support** - Add walk-in guests on the spot

### Admin Dashboard
- **Overview Stats** - Today's bookings, revenue, guests, pending waivers
- **Calendar View** - Weekly calendar with booking density
- **Booking Management** - Full CRUD for all bookings
- **Customer CRM** - Customer database with booking history

### Communication
- **Email** - Confirmations, reminders, review requests
- **SMS** - Twilio integration for text notifications
- **WhatsApp** - Twilio WhatsApp API support

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 14 (App Router) |
| Styling | Tailwind CSS 4.0 |
| UI Components | shadcn/ui |
| Database | Supabase (PostgreSQL) |
| Authentication | Supabase Auth |
| File Storage | Supabase Storage |
| Payments | Stripe |
| Email | Resend |
| SMS/WhatsApp | Twilio |

## Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm
- Supabase account
- Stripe account (for payments)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/booking-system.git
cd booking-system
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env.local
```

4. Configure your environment variables in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

RESEND_API_KEY=re_...

TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
```

5. Set up the database:
   - Go to your Supabase project
   - Navigate to SQL Editor
   - Run the schema from `supabase/schema.sql`

6. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── (public)/           # Public pages (tours, booking)
│   │   ├── page.tsx        # Homepage
│   │   ├── tours/          # Tour listings & details
│   │   ├── book/           # Booking checkout
│   │   ├── booking/        # Booking confirmation
│   │   └── waiver/         # Waiver signing
│   │
│   ├── dashboard/          # Admin dashboard
│   │   ├── page.tsx        # Dashboard overview
│   │   ├── calendar/       # Calendar view
│   │   ├── bookings/       # Booking management
│   │   ├── customers/      # CRM
│   │   └── manifest/       # Captain's manifest
│   │
│   └── api/                # API routes
│       ├── tours/
│       ├── bookings/
│       ├── waivers/
│       └── manifest/
│
├── components/
│   ├── ui/                 # shadcn/ui components
│   └── shared/             # Shared components
│
├── lib/
│   └── supabase/           # Supabase clients
│
└── types/                  # TypeScript types
```

## Key Pages

| Route | Description |
|-------|-------------|
| `/` | Homepage with featured tours |
| `/tours` | All tours listing |
| `/tours/[slug]` | Tour details with booking widget |
| `/book/[slug]` | Multi-step checkout |
| `/booking/[ref]` | Booking confirmation |
| `/waiver/[token]` | Waiver signing page |
| `/dashboard` | Admin dashboard |
| `/dashboard/calendar` | Calendar view |
| `/dashboard/manifest` | Captain's attendance sheet |
| `/dashboard/bookings` | Booking management |
| `/dashboard/customers` | Customer CRM |

## Database Schema

The system uses the following main tables:
- `tours` - Tour definitions
- `availabilities` - Time slots for tours
- `customers` - Customer database
- `bookings` - Booking records
- `booking_guests` - Guest details per booking
- `waivers` - Waiver signatures
- `waiver_templates` - Waiver document templates
- `staff` - Staff/crew members
- `communications` - Email/SMS log

See `supabase/schema.sql` for the complete schema.

## Waiver Status Colors

| Status | Color | Meaning |
|--------|-------|---------|
| Signed | Green | All guests have signed |
| Partial | Orange | Some guests signed |
| Pending | Red | No signatures yet |

## Cost Comparison vs FareHarbor

| Fee Type | FareHarbor | This System |
|----------|------------|-------------|
| Direct Bookings | 6% | 0% |
| OTA Bookings | 8% | 0% |
| Payment Processing | ~2% | ~2.9% (Stripe) |
| Monthly Cost | $0 | ~$25 (hosting) |

**On $10,000 revenue: Save $285-$485!**

## License

MIT

## Contributing

Pull requests welcome!
