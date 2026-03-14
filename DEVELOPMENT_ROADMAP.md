# TourPilot Development Roadmap - 3.5 Week Sprint

**Duration**: 24.5 Days (3.5 Weeks)
**Start Date**: [Today's Date]
**End Date**: 3.5 weeks from start

---

## 📋 Overview

This roadmap covers all remaining features and enhancements needed to bring TourPilot to production-ready status. The sprint is divided into 4 phases with clear milestones and deliverables.

---

## Phase 1: Core Location & Captain Management (Days 1-7)

### Week 1 Sprint Goals
- Implement location management (CRUD)
- Create captain-location assignments
- Build location switching for admin and captain portals
- Set up multiple boats per location management

---

### 1.1 Location Management System
**Days: 1-3**

#### Backend
- [ ] Create `locations` table migration
  - Fields: id, name, city, address, latitude, longitude, description, is_active, created_at, updated_at
- [ ] Create `location_boats` table
  - Fields: id, location_id, boat_name, capacity, boat_type, registration_number, is_active, created_at, updated_at
- [ ] Create `captain_location_assignments` table
  - Fields: id, captain_id, location_id, boat_id, is_active, assigned_date, created_at, updated_at

#### API Endpoints
- [ ] `GET /api/locations` - List all locations
- [ ] `POST /api/locations` - Create new location (admin only)
- [ ] `GET /api/locations/[id]` - Get location details
- [ ] `PUT /api/locations/[id]` - Update location (admin only)
- [ ] `DELETE /api/locations/[id]` - Soft delete location (admin only)

- [ ] `GET /api/locations/[id]/boats` - Get boats for a location
- [ ] `POST /api/locations/[id]/boats` - Add boat to location
- [ ] `PUT /api/locations/[id]/boats/[boat_id]` - Update boat details
- [ ] `DELETE /api/locations/[id]/boats/[boat_id]` - Delete boat

- [ ] `GET /api/captain/assignments` - Get captain's assignments
- [ ] `POST /api/captain/locations/[location_id]/switch` - Switch to location

#### Database Permissions (RLS)
- [ ] Admin can CRUD all locations and boats
- [ ] Captains can only view their assigned locations
- [ ] Managers can view and edit locations in their jurisdiction

---

### 1.2 Admin Location Management UI
**Days: 2-4**

#### Pages
- [ ] `/dashboard/locations` - Location listing page
  - Table: Location name, city, boats count, captains assigned, active status, actions
  - Search by name/city
  - Add new location button
  - Bulk actions (activate/deactivate)

- [ ] `/dashboard/locations/new` - Create location form
  - Fields: Name, City, Address, Latitude, Longitude, Description
  - Google Maps integration for address lookup
  - Form validation with Zod

- [ ] `/dashboard/locations/[id]` - Location detail & edit
  - Location info section (editable)
  - Boats management subsection
  - Captains assigned to location
  - Availability calendar for location
  - Edit and delete buttons

- [ ] `/dashboard/locations/[id]/boats` - Boat management
  - List of boats at location
  - Boat details (name, capacity, type, registration)
  - Add new boat modal
  - Edit boat modal
  - Delete boat confirmation

#### Components
- [ ] `LocationCard` - Display location summary
- [ ] `LocationForm` - Reusable location form component
- [ ] `BoatForm` - Boat creation/edit form
- [ ] `BoatList` - Boats list with actions
- [ ] `LocationSelector` - Dropdown to switch locations (admin view)

---

### 1.3 Captain Assignment & Location Switching
**Days: 4-5**

#### Pages
- [ ] `/dashboard/locations/[id]/assign-captains` - Assign captains to location
  - List of available captains
  - Multi-select or checkbox interface
  - Boat assignment per captain
  - Assign and remove buttons
  - Save and confirmation toast

#### Captain Portal Features
- [ ] `/captain/locations` - Captain's available locations
  - List of locations captain is assigned to
  - Quick switch button for each location
  - Display current location
  - Boat assignment info

- [ ] `/captain` - Updated captain dashboard with location context
  - Show "Currently viewing: [Location Name] - [Boat Name]"
  - Filter tours by current location and boat
  - Tours for assigned boat at selected location only

#### Components
- [ ] `CaptainLocationSwitcher` - Location switching dropdown
- [ ] `CaptainAssignmentForm` - Assign captains to locations
- [ ] `CaptainBoatSelector` - Select which boat captain is assigned to

---

### 1.4 Database & Data Relationships
**Days: 5-7**

#### Modifications
- [ ] Update `tours` table to include `location_id` foreign key
- [ ] Update `availability_staff` to reference `location_boats`
- [ ] Update `tours` to support multiple locations (one tour can operate from multiple locations)
- [ ] Create `tour_locations` junction table
  - Fields: id, tour_id, location_id, created_at

#### Triggers & Functions
- [ ] Trigger: Update location booking count when booking is created
- [ ] Trigger: Update boat capacity tracking
- [ ] Function: Get available captains for location & boat
- [ ] RLS Policy: Captains can only see bookings for their assigned boat/location

#### Data Migration
- [ ] Seed database with sample locations (if not exists)
- [ ] Assign existing tours to default location
- [ ] Create location-boat relationships

---

## Phase 2: Multi-Location Tours & Bookings (Days 8-12)

### Week 2 Sprint Goals
- Implement location-based tour bookings
- Create booking rescheduling system
- Build multiple boats per location management
- Integrate location switching across the app

---

### 2.1 Location-Based Tour Availability
**Days: 8-9**

#### Features
- [ ] Update `/tours` listing to show which locations tours operate from
- [ ] Update `/tours/[slug]` to show location selector
  - Dropdown to select location
  - Display boat assignment
  - Show captain for selected location

- [ ] Update `/book/[slug]` checkout flow
  - Add location selection step
  - Show boat info for selected location
  - Show captain info (optional)
  - Update availability based on location selection

#### API Updates
- [ ] `GET /api/tours/[slug]/availability` - Filter by location
  - Add `location_id` query parameter
  - Return availabilities for specific location and boat only

- [ ] `PUT /api/bookings/[id]/location-change` - Change booking location
  - Check availability at new location
  - Update booking location reference

---

### 2.2 Booking Rescheduling System
**Days: 9-11**

#### Backend
- [ ] Create `booking_reschedules` table
  - Fields: id, booking_id, from_availability_id, to_availability_id, reason, requested_by, status (pending/approved/rejected), created_at, updated_at

- [ ] API Endpoints
  - [ ] `POST /api/bookings/[id]/reschedule` - Request reschedule
    - Check availability
    - Create reschedule request
    - Send approval email to admin

  - [ ] `POST /api/bookings/[id]/reschedule/approve` - Admin approves reschedule
    - Update booking availability
    - Send confirmation email to customer
    - Log in communications table

  - [ ] `POST /api/bookings/[id]/reschedule/reject` - Admin rejects reschedule
    - Send rejection email with reason
    - Keep original booking active

#### Frontend - Customer Portal
- [ ] `/account/bookings/[id]/reschedule` - Reschedule request form
  - Show current booking details
  - Calendar to select new date
  - Show available time slots at new date
  - Reason for reschedule (dropdown: conflict, weather, work, other)
  - Submit button with confirmation

- [ ] `/account/bookings/[id]` - Update to show reschedule status
  - Display if reschedule is pending
  - Display if reschedule was approved/rejected
  - Link to make new reschedule request

#### Frontend - Admin Dashboard
- [ ] `/dashboard/reschedules` - Pending reschedule requests
  - Table: Booking ref, customer, from date, to date, reason, status
  - Approve and reject buttons
  - Comments section
  - View original booking modal

#### Email Templates
- [ ] Reschedule request email (to admin)
- [ ] Reschedule approved email (to customer)
- [ ] Reschedule rejected email (to customer)

---

### 2.3 Multiple Boats & Capacity Management
**Days: 11-12**

#### Features
- [ ] Update availability creation to select boat
  - `POST /api/availabilities` - Add `boat_id` field
  - Each availability tied to specific boat at location

- [ ] Capacity tracking per boat
  - `GET /api/locations/[id]/boats/[boat_id]/capacity` - Remaining capacity
  - Update capacity when booking created/cancelled

- [ ] Boat switching for captains
  - Captain can see all boats assigned to them at location
  - Switch active boat in captain portal
  - Store current boat in captain session

#### Components
- [ ] `BoatCapacityDisplay` - Show boat capacity and available spots
- [ ] `BoatSelector` - Select boat for new availability
- [ ] `CaptainBoatSwitcher` - Captain boat selection component

---

## Phase 3: Customer Analytics & POS System (Days 13-21)

### Weeks 2-3 Sprint Goals
- Implement customer behavior tracking and scoring
- Build POS system (online and offline modes)
- Create customer history and analytics
- Implement birthday campaign system

---

### 3.1 Customer Behavior & Scoring System
**Days: 13-15**

#### Database
- [ ] Create `customer_scores` table
  - Fields: id, customer_id, total_bookings, total_spent, lifetime_value, loyalty_score, visit_frequency, last_booking_date, created_at, updated_at

- [ ] Create `customer_actions` table (for tracking behavior)
  - Fields: id, customer_id, action_type (booking, cancellation, review, referral, waiver_signed), action_date, value, metadata, created_at

#### Scoring Algorithm
- [ ] Implement scoring function in PostgreSQL
  - 1 point per $10 spent
  - 5 points per booking completed
  - 10 bonus points for reviews
  - 3 points per referral
  - Loyalty tier system: Bronze (0-50), Silver (51-150), Gold (151-300), Platinum (300+)

#### API Endpoints
- [ ] `GET /api/customers/[id]/analytics` - Customer history
  - Total bookings, spending, visits
  - Booking frequency
  - Favorite tours
  - Average group size
  - Last booking info

- [ ] `GET /api/customers/[id]/score` - Customer loyalty score
  - Current score and tier
  - Points breakdown
  - Next tier progress

- [ ] `POST /api/customers/[id]/score/recalculate` - Admin action to recalculate

#### Frontend - Admin Dashboard
- [ ] `/dashboard/customers/[id]/analytics` - Customer detail with analytics
  - Loyalty score and tier display
  - Booking history (sortable)
  - Spending graph (last 12 months)
  - Tour preferences
  - Review and feedback section
  - Group size trends

- [ ] Update `/dashboard/customers` list page
  - Add "Loyalty Tier" column with color coding
  - Add "Total Spent" column
  - Add "Bookings" column
  - Filter by loyalty tier
  - Sort by spending/bookings

#### Components
- [ ] `LoyaltyScoreBadge` - Display loyalty tier with icon
- [ ] `CustomerAnalytics` - Chart showing spending history
- [ ] `CustomerHistory` - Timeline of customer actions
- [ ] `FavoriteToursDisplay` - Show customer's favorite tours

---

### 3.2 POS System - Backend & Core
**Days: 15-18**

#### Database
- [ ] Create `pos_transactions` table
  - Fields: id, booking_id, amount, payment_method, status (pending/completed/failed), transaction_id, receipt_id, created_by (staff_id), is_offline, synced_at, created_at, updated_at

- [ ] Create `pos_items` table
  - Fields: id, name, price, category (tour_addon, merchandise, food, beverage), is_active, created_at

- [ ] Create `pos_transaction_items` table
  - Fields: id, transaction_id, pos_item_id, quantity, unit_price, subtotal

- [ ] Create `offline_queue` table (for offline transactions)
  - Fields: id, transaction_id, status (pending/synced), data (JSON), created_at, synced_at

#### API Endpoints
- [ ] `POST /api/pos/transactions` - Create POS transaction
  - Amount, payment method, items
  - Link to booking or standalone
  - Validate payment amount matches booking total

- [ ] `GET /api/pos/transactions` - List transactions
  - Filters: date range, payment method, status
  - Admin/manager access only

- [ ] `GET /api/pos/items` - Get available POS items
- [ ] `POST /api/pos/items` - Create POS item (admin only)
- [ ] `PUT /api/pos/items/[id]` - Update POS item
- [ ] `DELETE /api/pos/items/[id]` - Delete POS item

- [ ] `POST /api/pos/offline-queue` - Queue transaction for offline mode
- [ ] `POST /api/pos/sync` - Sync offline transactions
  - Bulk sync queued transactions
  - Update statuses

#### Offline Functionality
- [ ] Implement local IndexedDB storage for offline queue
- [ ] Service Worker for offline detection
- [ ] Automatic sync when online

---

### 3.3 POS System - Frontend & UI
**Days: 17-19**

#### Pages
- [ ] `/dashboard/pos` - Main POS system page
  - Quick access to create transaction
  - Recent transactions list
  - Today's revenue summary
  - Offline status indicator

- [ ] `/dashboard/pos/new` - Create transaction
  - Search/select booking or create standalone
  - Display booking total if linked
  - Add-on items selector
  - Quantity controls
  - Discount/coupon application
  - Payment method selector (Cash, Card, Stripe, Check)
  - Notes/memo field
  - Complete transaction button
  - Receipt preview

- [ ] `/dashboard/pos/transactions` - Transaction history
  - Table: Date, booking ref, amount, payment method, staff member, status
  - Search and filter
  - Export to CSV
  - Reprint receipt button
  - View transaction details modal

- [ ] `/dashboard/pos/items` - Manage POS items
  - List of items with price, category, active status
  - Add new item button
  - Edit item modal
  - Delete item with confirmation
  - Bulk import from CSV

- [ ] `/dashboard/pos/reports` - POS analytics
  - Daily/weekly/monthly revenue
  - Payment method breakdown (pie chart)
  - Top items sold
  - Staff member sales (leaderboard)
  - Discount/coupon usage

#### Components
- [ ] `POSTransactionForm` - Create transaction form
- [ ] `POSItemSelector` - Select items and quantities
- [ ] `PaymentMethodSelector` - Choose payment type
- [ ] `ReceiptPreview` - Preview of receipt
- [ ] `OfflineStatusIndicator` - Show offline/sync status
- [ ] `POSRevenueChart` - Display revenue trends

#### Receipt Template
- [ ] HTML receipt template
  - Tour name and date
  - Guest names
  - Amount breakdown
  - Payment method
  - Transaction ID
  - Staff member
  - Printable format

---

### 3.4 Birthday Campaign System
**Days: 19-21**

#### Database
- [ ] Update `customers` table to include `date_of_birth`
- [ ] Create `campaigns` table
  - Fields: id, name, type (birthday, seasonal, referral), is_active, created_at, updated_at

- [ ] Create `campaign_recipients` table
  - Fields: id, campaign_id, customer_id, sent_at, opened_at, clicked_at, created_at

#### Features
- [ ] Automatic birthday detection
  - Cron job: Check for customers with birthdays in next 7 days
  - Create campaign task for admin review

- [ ] Email campaign system
  - `/dashboard/campaigns` - View active campaigns
  - `/dashboard/campaigns/birthday` - Birthday campaign automation
  - Settings: Discount percentage, offer validity, email template
  - Schedule birthday emails

#### Email Template
- [ ] Birthday discount email
  - Personalized greeting with customer name
  - Special birthday discount offer (e.g., 15% off)
  - Valid from birthday week for 30 days
  - Call to action button
  - Unique discount code

#### API Endpoints
- [ ] `GET /api/campaigns` - List campaigns
- [ ] `POST /api/campaigns` - Create campaign
- [ ] `POST /api/campaigns/birthday/queue` - Queue birthday emails
- [ ] `POST /api/campaigns/birthday/send` - Send queued birthday emails
- [ ] `GET /api/campaigns/[id]/analytics` - Campaign performance

---

## Phase 4: Payments, Polish & Testing (Days 22-24.5)

### Week 3.5 Sprint Goals
- Complete Stripe integration
- Polish UI/UX
- Comprehensive testing
- Performance optimization
- Deployment preparation

---

### 4.1 Stripe Payment Gateway Integration
**Days: 22-23**

#### Backend
- [ ] Update `bookings` table
  - Fields: stripe_payment_intent_id, stripe_customer_id, payment_method, amount_paid
  - Add check constraints for payment validation

- [ ] Create `payment_logs` table
  - Fields: id, booking_id, amount, currency, status, stripe_event_id, error_message, created_at

#### API Endpoints
- [ ] `POST /api/payments/create-payment-intent` - Create Stripe intent
  - Calculate amount from booking
  - Create customer in Stripe
  - Return client secret

- [ ] `POST /api/payments/webhook` - Stripe webhook handler
  - Handle payment_intent.succeeded
  - Handle payment_intent.payment_failed
  - Update booking payment status
  - Send confirmation email
  - Log transaction

- [ ] `GET /api/payments/[booking_id]/status` - Check payment status
- [ ] `POST /api/payments/refund` - Process refund (admin only)

#### Stripe Setup
- [ ] Create Stripe account integration
- [ ] Configure webhook endpoints
- [ ] Set up test and live keys in environment
- [ ] Tax calculation in payment form

#### Frontend - Checkout
- [ ] Update `/book/[slug]` checkout flow
  - Add payment summary step
  - Stripe Elements form integration
  - Real-time validation
  - Loading state during processing
  - Error handling with user-friendly messages
  - 3D Secure support for high-value transactions

- [ ] Payment status page after checkout
  - Success message
  - Download receipt
  - Add to calendar button
  - Booking reference

#### Components
- [ ] `StripePaymentForm` - Card input form
- [ ] `PaymentSummary` - Show amount breakdown
- [ ] `PaymentStatusDisplay` - Show payment confirmation

#### Email Templates
- [ ] Payment confirmation email
- [ ] Payment failed email with retry link
- [ ] Refund notification email

---

### 4.2 UI Polish & UX Improvements
**Days: 22-24**

#### Dashboard
- [ ] [ ] Consistent color scheme across all pages
- [ ] Dark mode support (optional toggle in settings)
- [ ] Responsive design audit and fixes
  - Mobile: 320px+
  - Tablet: 768px+
  - Desktop: 1024px+
- [ ] Loading skeleton screens for all pages
- [ ] Empty states for all list pages
- [ ] Toast notifications standardization
- [ ] Modal animations and transitions
- [ ] Hover states on all buttons and interactive elements

#### Public Site
- [ ] Hero section enhancement
- [ ] Animated tour cards
- [ ] Smoother scroll experience
- [ ] Better mobile navigation
- [ ] CTA button consistency
- [ ] Footer improvements

#### Components
- [ ] Standardize button sizes and styles
- [ ] Consistent input field styling
- [ ] Badge and tag styles
- [ ] Card component polishing
- [ ] Table header improvements
- [ ] Pagination component styling

#### Forms
- [ ] Better error messages (not just field errors, helper text)
- [ ] Field-level validation feedback
- [ ] Auto-save indicators (if applicable)
- [ ] Smart form defaults

#### Accessibility
- [ ] ARIA labels on all interactive elements
- [ ] Keyboard navigation throughout
- [ ] Focus indicators
- [ ] Color contrast validation (WCAG AA)
- [ ] Screen reader testing

---

### 4.3 Comprehensive Testing
**Days: 22-24.5**

#### Unit Tests
- [ ] Email sending functions
- [ ] Customer scoring algorithm
- [ ] Availability calculation functions
- [ ] Booking reference generation
- [ ] Payment calculation logic
- [ ] Loyalty tier assignment

#### Integration Tests
- [ ] Complete booking flow (start to finish)
- [ ] Reschedule workflow
- [ ] POS transaction creation and sync
- [ ] Stripe payment integration
- [ ] Location switching
- [ ] Captain assignment workflow
- [ ] Birthday campaign automation

#### E2E Tests
- [ ] User signup and login
- [ ] Browse tours → Book → Pay → Receive confirmation
- [ ] Admin create location and assign captain
- [ ] Captain check-in workflow
- [ ] Customer reschedule booking
- [ ] Admin create POS transaction
- [ ] Offline POS sync

#### Performance Testing
- [ ] Page load time audit (target: <3s)
- [ ] API response times (target: <500ms)
- [ ] Database query optimization
- [ ] Image optimization
- [ ] Code splitting validation
- [ ] Bundle size analysis

#### Security Testing
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (input sanitization)
- [ ] CSRF protection (token validation)
- [ ] Rate limiting on API endpoints
- [ ] Authentication/authorization enforcement
- [ ] Data exposure audit (no sensitive data in logs)
- [ ] Payment data security (no credit cards stored)

#### Compatibility Testing
- [ ] Chrome, Firefox, Safari, Edge (latest versions)
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)
- [ ] Tablet browsers
- [ ] Different screen sizes

---

### 4.4 Deployment & DevOps
**Days: 23-24.5**

#### Environment Setup
- [ ] Review all environment variables
- [ ] Set up production Stripe keys
- [ ] Configure production Supabase instance
- [ ] Production email service setup (Resend)
- [ ] Production Google OAuth setup

#### Database
- [ ] Test all migrations on production environment
- [ ] Create database backup strategy
- [ ] Document recovery procedures
- [ ] Set up database monitoring

#### Monitoring & Logging
- [ ] Set up error tracking (Sentry or equivalent)
- [ ] API monitoring and alerts
- [ ] Database performance monitoring
- [ ] User activity logging
- [ ] Payment transaction logging

#### Documentation
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Database schema documentation
- [ ] Setup and deployment guide
- [ ] Troubleshooting guide
- [ ] Staff user manual
- [ ] Admin configuration guide

#### Go-Live Checklist
- [ ] All tests passing
- [ ] No console errors/warnings
- [ ] All environment variables set
- [ ] Backup systems tested
- [ ] Error handling verified
- [ ] Support team trained
- [ ] Monitoring dashboard set up
- [ ] Rollback plan documented

---

## 📊 Timeline Summary

| Phase | Duration | Key Deliverables |
|-------|----------|-----------------|
| **Phase 1** | Days 1-7 | Location CRUD, Captain assignments, Multi-boat system |
| **Phase 2** | Days 8-12 | Location-based availability, Booking reschedules |
| **Phase 3** | Days 13-21 | Customer analytics, POS system, Birthday campaigns |
| **Phase 4** | Days 22-24.5 | Stripe integration, UI polish, Testing, Deployment |

---

## 🎯 Success Metrics

- [ ] All features complete and working
- [ ] 90%+ test coverage for critical paths
- [ ] Zero critical security vulnerabilities
- [ ] <3 second page load time
- [ ] Zero breaking bugs in E2E tests
- [ ] All API endpoints documented
- [ ] Staff can complete key workflows in <2 minutes

---

## 📝 Notes

- **Database Migrations**: Each day should include migrations before feature implementation
- **API Security**: All endpoints need role-based access control
- **Error Handling**: Comprehensive error messages for users
- **Email Templates**: All should be tested before going live
- **Stripe Testing**: Use test keys throughout testing phase, switch to production keys before go-live
- **Offline Mode**: Critical for POS - needs thorough testing with poor/no connectivity

---

## 🚀 Post-Launch

- Monitor error tracking for 24/7 support
- Gather user feedback for v2.0
- Plan analytics and reporting enhancements
- Consider mobile app development

