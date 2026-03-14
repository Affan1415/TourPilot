# TourPilot Development Checklist

Use this checklist to track progress through the 3.5-week development sprint.

---

## Phase 1: Core Location & Captain Management (Days 1-7)

### Week 1 - Location Management System (Days 1-3)

#### Backend
- [ ] Create `locations` table migration
- [ ] Create `location_boats` table migration
- [ ] Create `captain_location_assignments` table migration
- [ ] Implement location API endpoints:
  - [ ] `GET /api/locations`
  - [ ] `POST /api/locations`
  - [ ] `GET /api/locations/[id]`
  - [ ] `PUT /api/locations/[id]`
  - [ ] `DELETE /api/locations/[id]`
- [ ] Implement boat API endpoints:
  - [ ] `GET /api/locations/[id]/boats`
  - [ ] `POST /api/locations/[id]/boats`
  - [ ] `PUT /api/locations/[id]/boats/[boat_id]`
  - [ ] `DELETE /api/locations/[id]/boats/[boat_id]`
- [ ] Implement captain assignment endpoints:
  - [ ] `GET /api/captain/assignments`
  - [ ] `POST /api/captain/locations/[location_id]/switch`
- [ ] Set up RLS policies for location access
- [ ] Create database triggers for location analytics

#### Frontend
- [ ] Create `/dashboard/locations` page
- [ ] Create `/dashboard/locations/new` form
- [ ] Create `/dashboard/locations/[id]` detail page
- [ ] Build LocationCard component
- [ ] Build LocationForm component
- [ ] Test location CRUD operations

### Days 2-4: Admin Location UI

- [ ] Build location listing table with search
- [ ] Add location form validation (Zod)
- [ ] Add Google Maps integration for addresses
- [ ] Create boat management section
- [ ] Build BoatForm component
- [ ] Build BoatList component
- [ ] Test all location UI

### Days 4-5: Captain Assignment & Location Switching

- [ ] Create `/dashboard/locations/[id]/assign-captains` page
- [ ] Build captain multi-select interface
- [ ] Create `/captain/locations` page
- [ ] Build CaptainLocationSwitcher component
- [ ] Update captain dashboard to show location context
- [ ] Test captain assignment workflow

### Days 5-7: Database & Data Relationships

- [ ] Update `tours` table to add `location_id`
- [ ] Create `tour_locations` junction table
- [ ] Update `availability_staff` for boat references
- [ ] Create database triggers for:
  - [ ] Location booking count updates
  - [ ] Boat capacity tracking
- [ ] Create RLS policy for captain location isolation
- [ ] Run data migrations
- [ ] Seed sample locations (if needed)

**Phase 1 Complete When**: All tests passing, admin can create/manage locations, captains can switch locations

---

## Phase 2: Multi-Location Tours & Bookings (Days 8-12)

### Days 8-9: Location-Based Availability

- [ ] Update `/tours` listing to show locations
- [ ] Add location selector to `/tours/[slug]`
- [ ] Display boat info on tour details
- [ ] Update `/book/[slug]` checkout with location selection
- [ ] Create `GET /api/tours/[slug]/availability?location_id=` endpoint
- [ ] Create `PUT /api/bookings/[id]/location-change` endpoint
- [ ] Update availability queries to filter by location
- [ ] Test location-based booking flow

### Days 9-11: Booking Reschedule System

#### Backend
- [ ] Create `booking_reschedules` table
- [ ] Create API endpoints:
  - [ ] `POST /api/bookings/[id]/reschedule`
  - [ ] `POST /api/bookings/[id]/reschedule/approve`
  - [ ] `POST /api/bookings/[id]/reschedule/reject`
- [ ] Implement availability checking for reschedules
- [ ] Create email notification system

#### Frontend
- [ ] Create `/account/bookings/[id]/reschedule` form
- [ ] Add reschedule status to `/account/bookings/[id]`
- [ ] Create `/dashboard/reschedules` admin page
- [ ] Build reschedule request table
- [ ] Build approve/reject interface
- [ ] Add email templates:
  - [ ] Reschedule request email
  - [ ] Reschedule approved email
  - [ ] Reschedule rejected email

#### Testing
- [ ] Test reschedule request submission
- [ ] Test admin approval workflow
- [ ] Test customer email notifications
- [ ] Test availability validation

### Days 11-12: Multiple Boats & Capacity Management

- [ ] Update availability creation to include `boat_id`
- [ ] Create boat capacity API endpoint
- [ ] Update booking capacity validation
- [ ] Build BoatCapacityDisplay component
- [ ] Build BoatSelector component
- [ ] Test multi-boat availability
- [ ] Test capacity tracking

**Phase 2 Complete When**: Customers can reschedule, boats have per-location capacity tracking

---

## Phase 3: Customer Analytics & POS System (Days 13-21)

### Days 13-15: Customer Behavior & Scoring

#### Backend
- [ ] Create `customer_scores` table
- [ ] Create `customer_actions` table
- [ ] Implement scoring algorithm function in PostgreSQL
- [ ] Create API endpoints:
  - [ ] `GET /api/customers/[id]/analytics`
  - [ ] `GET /api/customers/[id]/score`
  - [ ] `POST /api/customers/[id]/score/recalculate`
- [ ] Create triggers for score updates

#### Frontend
- [ ] Create `/dashboard/customers/[id]/analytics` page
- [ ] Update `/dashboard/customers` list with:
  - [ ] Loyalty tier column
  - [ ] Total spent column
  - [ ] Bookings column
  - [ ] Filter by tier
  - [ ] Sort options
- [ ] Build LoyaltyScoreBadge component
- [ ] Build CustomerAnalytics chart
- [ ] Build CustomerHistory timeline
- [ ] Build FavoriteToursDisplay component

#### Testing
- [ ] Test scoring algorithm
- [ ] Test tier assignment
- [ ] Test analytics dashboard
- [ ] Test customer filtering

### Days 15-18: POS System - Backend & Core

#### Database
- [ ] Create `pos_transactions` table
- [ ] Create `pos_items` table
- [ ] Create `pos_transaction_items` table
- [ ] Create `offline_queue` table

#### Backend
- [ ] Create API endpoints:
  - [ ] `POST /api/pos/transactions`
  - [ ] `GET /api/pos/transactions`
  - [ ] `GET /api/pos/items`
  - [ ] `POST /api/pos/items`
  - [ ] `PUT /api/pos/items/[id]`
  - [ ] `DELETE /api/pos/items/[id]`
  - [ ] `POST /api/pos/offline-queue`
  - [ ] `POST /api/pos/sync`

#### Frontend (Offline Support)
- [ ] Set up IndexedDB for offline queue
- [ ] Implement Service Worker
- [ ] Create offline detection
- [ ] Implement auto-sync when online

#### Testing
- [ ] Test transaction creation
- [ ] Test offline queueing
- [ ] Test online sync
- [ ] Test payment calculation

### Days 17-19: POS System - Frontend & UI

- [ ] Create `/dashboard/pos` main page
- [ ] Create `/dashboard/pos/new` transaction form
- [ ] Create `/dashboard/pos/transactions` history page
- [ ] Create `/dashboard/pos/items` management page
- [ ] Create `/dashboard/pos/reports` analytics page
- [ ] Build POSTransactionForm component
- [ ] Build POSItemSelector component
- [ ] Build PaymentMethodSelector component
- [ ] Build ReceiptPreview component
- [ ] Build OfflineStatusIndicator component
- [ ] Build POSRevenueChart component
- [ ] Create receipt HTML template
- [ ] Test all POS workflows
- [ ] Test offline/online transitions

### Days 19-21: Birthday Campaign System

#### Database
- [ ] Update `customers` table to add `date_of_birth`
- [ ] Create `campaigns` table
- [ ] Create `campaign_recipients` table

#### Backend
- [ ] Create API endpoints:
  - [ ] `GET /api/campaigns`
  - [ ] `POST /api/campaigns`
  - [ ] `POST /api/campaigns/birthday/queue`
  - [ ] `POST /api/campaigns/birthday/send`
  - [ ] `GET /api/campaigns/[id]/analytics`
- [ ] Create birthday detection cron job
- [ ] Implement campaign email system

#### Frontend
- [ ] Create `/dashboard/campaigns` page
- [ ] Create `/dashboard/campaigns/birthday` automation page
- [ ] Build birthday campaign settings
- [ ] Build campaign analytics
- [ ] Create birthday email template

#### Testing
- [ ] Test birthday detection
- [ ] Test email queueing
- [ ] Test campaign analytics
- [ ] Test discount code generation

**Phase 3 Complete When**: POS system working offline/online, customer scoring active, birthday campaigns automated

---

## Phase 4: Payments, Polish & Testing (Days 22-24.5)

### Days 22-23: Stripe Payment Integration

#### Backend
- [ ] Update `bookings` table with Stripe fields:
  - [ ] `stripe_payment_intent_id`
  - [ ] `stripe_customer_id`
  - [ ] `payment_method`
  - [ ] `amount_paid`
- [ ] Create `payment_logs` table
- [ ] Create API endpoints:
  - [ ] `POST /api/payments/create-payment-intent`
  - [ ] `POST /api/payments/webhook`
  - [ ] `GET /api/payments/[booking_id]/status`
  - [ ] `POST /api/payments/refund`
- [ ] Implement Stripe webhook handler
- [ ] Set up test/production keys

#### Frontend
- [ ] Update `/book/[slug]` checkout with:
  - [ ] Payment summary step
  - [ ] StripePaymentForm component
  - [ ] PaymentSummary component
- [ ] Create payment success page
- [ ] Create payment error handling
- [ ] Add 3D Secure support
- [ ] Build PaymentStatusDisplay component

#### Email
- [ ] Create payment confirmation email
- [ ] Create payment failed email
- [ ] Create refund notification email

#### Testing
- [ ] Test payment intent creation
- [ ] Test webhook handling
- [ ] Test payment success flow
- [ ] Test payment failure recovery
- [ ] Test refund processing

### Days 22-24: UI Polish & UX Improvements

#### Dashboard
- [ ] Review and fix responsive design (320px+)
- [ ] Add dark mode support (optional toggle)
- [ ] Add loading skeletons for all pages
- [ ] Design empty states for all lists
- [ ] Standardize toast notifications
- [ ] Add modal animations
- [ ] Add hover states to all interactive elements

#### Public Site
- [ ] Enhance hero section
- [ ] Add tour card animations
- [ ] Improve mobile navigation
- [ ] Standardize CTA buttons
- [ ] Improve footer

#### Components
- [ ] Standardize button sizes/styles
- [ ] Standardize input field styling
- [ ] Polish badge and tag styles
- [ ] Improve table styling
- [ ] Enhance pagination UI

#### Accessibility
- [ ] Add ARIA labels to all interactive elements
- [ ] Ensure keyboard navigation works throughout
- [ ] Add focus indicators
- [ ] Validate color contrast (WCAG AA)
- [ ] Test with screen reader

#### Testing
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile browser testing (iOS Safari, Chrome Mobile)
- [ ] Tablet testing
- [ ] Different screen sizes

### Days 22-24.5: Testing & Deployment

#### Unit Tests
- [ ] Email sending functions
- [ ] Customer scoring algorithm
- [ ] Availability calculation
- [ ] Booking reference generation
- [ ] Payment calculation logic
- [ ] Loyalty tier assignment

#### Integration Tests
- [ ] Complete booking flow
- [ ] Reschedule workflow
- [ ] POS transaction creation/sync
- [ ] Stripe payment integration
- [ ] Location switching
- [ ] Captain assignment
- [ ] Birthday campaign automation

#### E2E Tests
- [ ] User signup → login
- [ ] Browse tours → book → pay → confirmation
- [ ] Admin create location → assign captain
- [ ] Captain check-in workflow
- [ ] Customer reschedule booking
- [ ] Admin create POS transaction
- [ ] Offline POS sync

#### Performance Tests
- [ ] Page load times (target: <3s)
- [ ] API response times (target: <500ms)
- [ ] Database query optimization
- [ ] Image optimization
- [ ] Code splitting validation
- [ ] Bundle size analysis

#### Security Tests
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Rate limiting
- [ ] Authentication enforcement
- [ ] Data exposure audit
- [ ] Payment data security

#### Deployment Checklist
- [ ] All tests passing
- [ ] No console errors/warnings
- [ ] Environment variables set
- [ ] Production Stripe keys configured
- [ ] Backup systems tested
- [ ] Error tracking set up (Sentry)
- [ ] Monitoring configured
- [ ] Database backup strategy implemented
- [ ] Support team trained
- [ ] API documentation complete
- [ ] Deployment guide written

**Phase 4 Complete When**: All tests passing, Stripe working, UI polished, deployment ready

---

## Overall Sprint Checklist

### Pre-Development
- [ ] Review timeline page at `/timeline`
- [ ] Read full DEVELOPMENT_ROADMAP.md
- [ ] Set up development environment
- [ ] Create git feature branches for each phase

### During Development
- [ ] Commit regularly (don't batch changes)
- [ ] Run tests after each feature
- [ ] Update documentation as you go
- [ ] Test on multiple browsers/devices

### Post-Development
- [ ] All phases complete
- [ ] All tests passing
- [ ] All features working
- [ ] Documentation updated
- [ ] Team trained
- [ ] Go-live plan finalized

---

## Success Criteria

✅ **Phase 1**: Locations and captains can be managed, tours linked to locations
✅ **Phase 2**: Customers can reschedule bookings, locations have boats with capacity
✅ **Phase 3**: Customer analytics working, POS system functional offline/online, campaigns automated
✅ **Phase 4**: Payments processed via Stripe, UI polished, full test coverage, production ready

---

## Notes

- Update this checklist as you complete items
- Adjust timelines based on actual progress
- Document blockers and dependencies
- Keep team updated on progress
- Test regularly - don't wait until end of phase

---

**Last Updated**: March 11, 2026
**Status**: Ready to Begin Phase 1
**Total Effort**: 24.5 days
**Target Go-Live**: 3.5 weeks from start
