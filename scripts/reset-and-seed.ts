import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// ============================================
// TOUR DATA - Boat Tours for TourPilot
// ============================================
const tours = [
  {
    name: 'Sunset Sailing Cruise',
    slug: 'sunset-sailing-cruise',
    description: 'Experience the magic of the ocean as the sun sets over the horizon. Our luxury catamaran takes you on a peaceful journey with complimentary drinks and light appetizers. Perfect for couples and groups looking for a romantic evening on the water.',
    short_description: 'Romantic sunset cruise with drinks',
    duration_minutes: 150,
    base_price: 89,
    max_capacity: 24,
    min_guests: 2,
    images: ['https://images.unsplash.com/photo-1544551763-46a013bb70d5'],
    location: 'Marina Bay',
    meeting_point: 'Marina Bay Dock A, Slip 12',
    what_to_bring: ['Light jacket', 'Camera', 'Sunglasses'],
    includes: ['Welcome drink', 'Light appetizers', 'Professional captain', 'Safety equipment'],
    requires_waiver: true,
    status: 'active' as const
  },
  {
    name: 'Dolphin Watch Adventure',
    slug: 'dolphin-watch-adventure',
    description: 'Join us for an exciting dolphin watching expedition! Our expert guides know exactly where to find these playful creatures. We guarantee dolphin sightings or your next trip is free!',
    short_description: 'Exciting dolphin watching experience',
    duration_minutes: 180,
    base_price: 65,
    max_capacity: 20,
    min_guests: 4,
    images: ['https://images.unsplash.com/photo-1570481662006-a3a1374699e8'],
    location: 'Ocean Pier',
    meeting_point: 'Ocean Pier Terminal, Gate 3',
    what_to_bring: ['Sunscreen', 'Hat', 'Water bottle', 'Camera'],
    includes: ['Marine biologist guide', 'Binoculars', 'Bottled water', 'Dolphin guarantee'],
    requires_waiver: true,
    status: 'active' as const
  },
  {
    name: 'Snorkeling Paradise Tour',
    slug: 'snorkeling-paradise-tour',
    description: 'Discover the underwater world at our pristine coral reefs. All equipment provided, suitable for beginners and experienced snorkelers alike. Swim with tropical fish in crystal clear waters.',
    short_description: 'Snorkeling at beautiful coral reefs',
    duration_minutes: 240,
    base_price: 95,
    max_capacity: 12,
    min_guests: 2,
    images: ['https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c'],
    location: 'Coral Bay',
    meeting_point: 'Coral Bay Marina, Main Dock',
    what_to_bring: ['Swimsuit', 'Towel', 'Reef-safe sunscreen', 'Underwater camera (optional)'],
    includes: ['Snorkel gear', 'Wetsuit', 'Light lunch', 'Professional guide', 'Photos'],
    requires_waiver: true,
    status: 'active' as const
  },
  {
    name: 'Deep Sea Fishing Charter',
    slug: 'deep-sea-fishing-charter',
    description: 'Experience the thrill of deep sea fishing with our experienced captains. Target species include tuna, mahi-mahi, and marlin. All skill levels welcome - we provide everything you need.',
    short_description: 'Full-day deep sea fishing adventure',
    duration_minutes: 480,
    base_price: 199,
    max_capacity: 6,
    min_guests: 2,
    images: ['https://images.unsplash.com/photo-1544947950-fa07a98d237f'],
    location: 'Harbor Point',
    meeting_point: 'Harbor Point Fishing Dock',
    what_to_bring: ['Sunscreen', 'Hat', 'Cooler for your catch', 'Lunch'],
    includes: ['Fishing equipment', 'Bait and tackle', 'Fishing license', 'Fish cleaning service'],
    requires_waiver: true,
    status: 'active' as const
  },
  {
    name: 'Whale Watching Expedition',
    slug: 'whale-watching-expedition',
    description: 'Witness the majestic humpback whales during their annual migration. Our large, stable vessel ensures comfortable viewing for all passengers. Naturalist guides provide educational commentary.',
    short_description: 'Seasonal whale watching tour',
    duration_minutes: 210,
    base_price: 75,
    max_capacity: 40,
    min_guests: 8,
    images: ['https://images.unsplash.com/photo-1559827260-dc66d52bef19'],
    location: 'Whale Bay',
    meeting_point: 'Whale Bay Visitor Center',
    what_to_bring: ['Warm layers', 'Binoculars', 'Camera with zoom lens', 'Motion sickness medication if needed'],
    includes: ['Naturalist guide', 'Hot beverages', 'Whale ID chart', 'Viewing guarantee'],
    requires_waiver: true,
    status: 'active' as const
  }
];

// ============================================
// BOAT DATA
// ============================================
const boats = [
  {
    name: 'Sea Breeze',
    registration_number: 'SB-2024-001',
    boat_type: 'Catamaran',
    capacity: 30,
    description: 'Luxury 45-foot catamaran perfect for sunset cruises',
    features: ['Shaded deck', 'Bluetooth sound system', 'Ice chest', 'Bathroom'],
    status: 'active' as const
  },
  {
    name: 'Ocean Explorer',
    registration_number: 'OE-2024-002',
    boat_type: 'Motor Yacht',
    capacity: 20,
    description: 'Fast and stable motor yacht for dolphin watching',
    features: ['Viewing deck', 'Underwater camera', 'Air conditioning', 'GPS tracking'],
    status: 'active' as const
  },
  {
    name: 'Reef Runner',
    registration_number: 'RR-2024-003',
    boat_type: 'Dive Boat',
    capacity: 14,
    description: 'Purpose-built snorkel and dive boat',
    features: ['Dive platform', 'Fresh water shower', 'Equipment storage', 'Shade canopy'],
    status: 'active' as const
  },
  {
    name: 'Big Game Hunter',
    registration_number: 'BGH-2024-004',
    boat_type: 'Fishing Charter',
    capacity: 8,
    description: 'Professional fishing charter boat',
    features: ['Fighting chair', 'Live bait well', 'Fish finder', 'Outriggers'],
    status: 'active' as const
  },
  {
    name: 'Whale Watcher',
    registration_number: 'WW-2024-005',
    boat_type: 'Tour Vessel',
    capacity: 50,
    description: 'Large stable vessel for whale watching',
    features: ['Multiple viewing decks', 'Heated cabin', 'Snack bar', 'Hydrophone'],
    status: 'active' as const
  }
];

// ============================================
// STAFF DATA
// ============================================
const staff = [
  {
    name: 'Captain Mike Rodriguez',
    email: 'mike.rodriguez@tourpilot.com',
    phone: '+1-555-0101',
    role: 'captain' as const,
    is_active: true
  },
  {
    name: 'Captain Sarah Chen',
    email: 'sarah.chen@tourpilot.com',
    phone: '+1-555-0102',
    role: 'captain' as const,
    is_active: true
  },
  {
    name: 'Jake Thompson',
    email: 'jake.thompson@tourpilot.com',
    phone: '+1-555-0103',
    role: 'guide' as const,
    is_active: true
  },
  {
    name: 'Maria Santos',
    email: 'maria.santos@tourpilot.com',
    phone: '+1-555-0104',
    role: 'guide' as const,
    is_active: true
  },
  {
    name: 'Admin User',
    email: 'admin@tourpilot.com',
    phone: '+1-555-0100',
    role: 'admin' as const,
    is_active: true
  }
];

// ============================================
// CUSTOMER TEST SCENARIOS
// ============================================
const customers = [
  // VIP Repeat Customer
  {
    email: 'john.smith@email.com',
    first_name: 'John',
    last_name: 'Smith',
    phone: '+1-555-1001',
    country_code: 'US',
    notes: 'VIP customer - always requests front row seating',
    tags: ['VIP', 'Repeat']
  },
  // Corporate Group Leader
  {
    email: 'emily.johnson@acmecorp.com',
    first_name: 'Emily',
    last_name: 'Johnson',
    phone: '+1-555-1002',
    country_code: 'US',
    notes: 'Corporate booking manager at ACME Corp',
    tags: ['Corporate']
  },
  // Family Group
  {
    email: 'david.williams@family.com',
    first_name: 'David',
    last_name: 'Williams',
    phone: '+1-555-1003',
    country_code: 'US',
    notes: 'Always books for family of 4',
    tags: ['Family']
  },
  // International Tourist
  {
    email: 'sophie.muller@email.de',
    first_name: 'Sophie',
    last_name: 'Müller',
    phone: '+49-555-1004',
    country_code: 'DE',
    notes: 'German tourist - prefers morning tours',
    tags: []
  },
  // First-time Customer
  {
    email: 'michael.brown@gmail.com',
    first_name: 'Michael',
    last_name: 'Brown',
    phone: '+1-555-1005',
    country_code: 'US',
    notes: 'First booking - found us on TripAdvisor',
    tags: []
  },
  // Repeat Customer
  {
    email: 'jennifer.davis@outlook.com',
    first_name: 'Jennifer',
    last_name: 'Davis',
    phone: '+1-555-1006',
    country_code: 'US',
    notes: 'Regular customer - celebrates birthday with us annually',
    tags: ['Repeat']
  },
  // Honeymoon Couple
  {
    email: 'james.taylor@email.com',
    first_name: 'James',
    last_name: 'Taylor',
    phone: '+1-555-1007',
    country_code: 'US',
    notes: 'Honeymoon booking - requested champagne toast',
    tags: ['VIP']
  },
  // Group Organizer
  {
    email: 'amanda.martinez@email.com',
    first_name: 'Amanda',
    last_name: 'Martinez',
    phone: '+1-555-1008',
    country_code: 'US',
    notes: 'Organizes bachelorette parties',
    tags: ['Repeat']
  },
  // Senior Traveler
  {
    email: 'robert.anderson@aol.com',
    first_name: 'Robert',
    last_name: 'Anderson',
    phone: '+1-555-1009',
    country_code: 'US',
    notes: 'Senior traveler - needs wheelchair accessibility',
    tags: ['Family']
  },
  // Travel Blogger
  {
    email: 'jessica.white@travelblog.com',
    first_name: 'Jessica',
    last_name: 'White',
    phone: '+1-555-1010',
    country_code: 'US',
    notes: 'Travel influencer - 50K followers. Offered media rate.',
    tags: ['VIP']
  }
];

// Helper functions
function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// ============================================
// MAIN FUNCTIONS
// ============================================
async function cleanDatabase() {
  console.log('🧹 Cleaning database...\n');

  // Delete in order of dependencies
  const tables = [
    'waivers',
    'booking_guests',
    'communications',
    'bookings',
    'availability_staff',
    'availabilities',
    'customers',
    'tours',
    'boats',
    // Keep staff if they exist - just clean up assignments
  ];

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) {
        console.log(`   ⚠️  Could not clean ${table}: ${error.message}`);
      } else {
        console.log(`   ✅ Cleaned ${table}`);
      }
    } catch (e) {
      console.log(`   ⚠️  Skipping ${table}`);
    }
  }

  console.log('\n✅ Database cleaned!\n');
}

async function seedDatabase() {
  console.log('🌱 Seeding database with test data...\n');

  // 1. Insert Boats
  console.log('🚤 Creating boats...');
  const { data: boatsData, error: boatsError } = await supabase
    .from('boats')
    .insert(boats)
    .select();

  if (boatsError) throw boatsError;
  console.log(`   ✅ Created ${boatsData.length} boats`);

  // 2. Insert Tours (with boat assignments)
  console.log('\n🎯 Creating tours...');
  const toursWithBoats = tours.map((tour, index) => ({
    ...tour,
    boat_id: boatsData[index % boatsData.length].id
  }));

  const { data: toursData, error: toursError } = await supabase
    .from('tours')
    .insert(toursWithBoats)
    .select();

  if (toursError) throw toursError;
  console.log(`   ✅ Created ${toursData.length} tours`);

  // 3. Insert or Update Staff
  console.log('\n👥 Setting up staff...');
  for (const member of staff) {
    const { data: existing } = await supabase
      .from('staff')
      .select('id')
      .eq('email', member.email)
      .single();

    if (existing) {
      await supabase.from('staff').update(member).eq('id', existing.id);
      console.log(`   ✅ Updated ${member.name}`);
    } else {
      await supabase.from('staff').insert(member);
      console.log(`   ✅ Created ${member.name}`);
    }
  }

  const { data: staffData } = await supabase.from('staff').select('*').eq('is_active', true);
  const guides = staffData?.filter(s => ['guide', 'captain'].includes(s.role)) || [];

  // 4. Insert Customers
  console.log('\n👤 Creating customers...');
  const { data: customersData, error: customersError } = await supabase
    .from('customers')
    .insert(customers)
    .select();

  if (customersError) throw customersError;
  console.log(`   ✅ Created ${customersData.length} customers`);

  // 5. Create Availabilities for next 30 days
  console.log('\n📅 Creating availabilities...');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const timeSlots = [
    { start: '08:00', label: 'morning' },
    { start: '10:00', label: 'mid-morning' },
    { start: '13:00', label: 'afternoon' },
    { start: '16:00', label: 'late-afternoon' },
    { start: '18:00', label: 'sunset' }
  ];

  const availabilities: any[] = [];

  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const date = addDays(today, dayOffset);
    const dateStr = formatDate(date);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    for (const tour of toursData) {
      // More slots on weekends
      const slotsPerDay = isWeekend ? getRandomInt(2, 3) : getRandomInt(1, 2);
      const selectedSlots = timeSlots
        .sort(() => Math.random() - 0.5)
        .slice(0, slotsPerDay);

      for (const slot of selectedSlots) {
        const durationHours = Math.ceil(tour.duration_minutes / 60);
        const startHour = parseInt(slot.start.split(':')[0]);
        let endHour = startHour + durationHours;

        // Cap at 23:00 to avoid invalid times
        if (endHour > 23) endHour = 23;

        const availability = {
          tour_id: tour.id,
          boat_id: tour.boat_id,
          date: dateStr,
          start_time: slot.start,
          end_time: `${String(endHour).padStart(2, '0')}:00`,
          status: 'available'
        };

        availabilities.push(availability);
      }
    }
  }

  const { data: availData, error: availError } = await supabase
    .from('availabilities')
    .insert(availabilities)
    .select();

  if (availError) throw availError;
  console.log(`   ✅ Created ${availData.length} availability slots`);

  // Assign staff to availabilities
  console.log('\n👷 Assigning staff to tours...');
  let staffAssignments = 0;
  for (const avail of availData) {
    const guide = getRandomItem(guides);
    await supabase.from('availability_staff').insert({
      availability_id: avail.id,
      staff_id: guide.id,
      role: guide.role
    });
    staffAssignments++;
  }
  console.log(`   ✅ Created ${staffAssignments} staff assignments`);

  // 6. Create Bookings (various scenarios)
  console.log('\n📝 Creating bookings with various scenarios...');

  // Get waiver template
  const { data: waiverTemplate } = await supabase
    .from('waiver_templates')
    .select('id')
    .eq('is_active', true)
    .limit(1)
    .single();

  // Get availabilities with tour info
  const { data: availsWithTours } = await supabase
    .from('availabilities')
    .select('*, tour:tours(*)')
    .order('date');

  const bookingScenarios = [
    // TODAY'S BOOKINGS - Ready for check-in
    { dayOffset: 0, status: 'confirmed', payment: 'paid', customerIndex: 0, guests: 2, scenario: 'VIP arriving today' },
    { dayOffset: 0, status: 'confirmed', payment: 'paid', customerIndex: 2, guests: 4, scenario: 'Family checking in' },
    { dayOffset: 0, status: 'checked_in', payment: 'paid', customerIndex: 3, guests: 2, scenario: 'Already checked in' },

    // TOMORROW'S BOOKINGS
    { dayOffset: 1, status: 'confirmed', payment: 'paid', customerIndex: 6, guests: 2, scenario: 'Honeymoon couple' },
    { dayOffset: 1, status: 'pending', payment: 'pending', customerIndex: 4, guests: 3, scenario: 'Pending payment' },
    { dayOffset: 1, status: 'confirmed', payment: 'paid', customerIndex: 1, guests: 8, scenario: 'Corporate group' },

    // THIS WEEK
    { dayOffset: 3, status: 'confirmed', payment: 'paid', customerIndex: 7, guests: 6, scenario: 'Bachelorette party' },
    { dayOffset: 4, status: 'confirmed', payment: 'paid', customerIndex: 5, guests: 2, scenario: 'Birthday celebration' },
    { dayOffset: 5, status: 'pending', payment: 'pending', customerIndex: 8, guests: 2, scenario: 'Senior couple - needs assist' },
    { dayOffset: 6, status: 'confirmed', payment: 'paid', customerIndex: 9, guests: 1, scenario: 'Travel blogger' },

    // NEXT WEEK
    { dayOffset: 8, status: 'confirmed', payment: 'paid', customerIndex: 0, guests: 4, scenario: 'VIP return visit' },
    { dayOffset: 10, status: 'confirmed', payment: 'paid', customerIndex: 1, guests: 12, scenario: 'Large corporate event' },
    { dayOffset: 12, status: 'pending', payment: 'pending', customerIndex: 2, guests: 4, scenario: 'Family vacation' },

    // PAST BOOKINGS (for history)
    { dayOffset: -1, status: 'completed', payment: 'paid', customerIndex: 5, guests: 2, scenario: 'Completed yesterday' },
    { dayOffset: -2, status: 'completed', payment: 'paid', customerIndex: 0, guests: 3, scenario: 'VIP completed' },
    { dayOffset: -3, status: 'cancelled', payment: 'refunded', customerIndex: 4, guests: 2, scenario: 'Weather cancellation' },
    { dayOffset: -5, status: 'no_show', payment: 'paid', customerIndex: 8, guests: 2, scenario: 'No show - keep payment' },
    { dayOffset: -7, status: 'completed', payment: 'paid', customerIndex: 3, guests: 2, scenario: 'Last week tour' },
  ];

  let bookingsCreated = 0;
  let guestsCreated = 0;

  for (const scenario of bookingScenarios) {
    const targetDate = formatDate(addDays(today, scenario.dayOffset));

    // Find an availability for this date
    const matchingAvails = availsWithTours?.filter(a => a.date === targetDate) || [];
    if (matchingAvails.length === 0) continue;

    const avail = getRandomItem(matchingAvails);
    const tour = avail.tour;
    const customer = customersData[scenario.customerIndex];

    const totalPrice = tour.base_price * scenario.guests;

    const { data: booking, error: bookError } = await supabase
      .from('bookings')
      .insert({
        customer_id: customer.id,
        availability_id: avail.id,
        guest_count: scenario.guests,
        total_price: totalPrice,
        status: scenario.status,
        payment_status: scenario.payment,
        checked_in: scenario.status === 'checked_in' || scenario.status === 'completed',
        checked_in_at: (scenario.status === 'checked_in' || scenario.status === 'completed')
          ? new Date().toISOString()
          : null,
        notes: scenario.scenario
      })
      .select()
      .single();

    if (bookError) {
      console.log(`   ⚠️  Could not create booking: ${bookError.message}`);
      continue;
    }

    bookingsCreated++;

    // Create booking guests
    const guestNames = [
      { first: customer.first_name, last: customer.last_name },
      { first: 'Guest', last: 'Two' },
      { first: 'Guest', last: 'Three' },
      { first: 'Guest', last: 'Four' },
      { first: 'Guest', last: 'Five' },
      { first: 'Guest', last: 'Six' },
      { first: 'Guest', last: 'Seven' },
      { first: 'Guest', last: 'Eight' },
      { first: 'Guest', last: 'Nine' },
      { first: 'Guest', last: 'Ten' },
      { first: 'Guest', last: 'Eleven' },
      { first: 'Guest', last: 'Twelve' },
    ];

    for (let g = 0; g < scenario.guests; g++) {
      const { data: guest, error: guestError } = await supabase
        .from('booking_guests')
        .insert({
          booking_id: booking.id,
          first_name: guestNames[g].first,
          last_name: guestNames[g].last,
          email: g === 0 ? customer.email : null,
          is_primary: g === 0,
          checked_in: booking.checked_in
        })
        .select()
        .single();

      if (!guestError) {
        guestsCreated++;

        // Create waivers if tour requires them
        if (tour.requires_waiver && waiverTemplate) {
          const waiverStatus = scenario.status === 'completed' || scenario.status === 'checked_in'
            ? 'signed'
            : getRandomItem(['pending', 'signed']);

          await supabase.from('waivers').insert({
            booking_id: booking.id,
            guest_id: guest.id,
            waiver_template_id: waiverTemplate.id,
            status: waiverStatus,
            signed_at: waiverStatus === 'signed' ? new Date().toISOString() : null,
            signature_url: waiverStatus === 'signed' ? 'data:image/png;base64,signature' : null
          });
        }
      }
    }
  }

  console.log(`   ✅ Created ${bookingsCreated} bookings`);
  console.log(`   ✅ Created ${guestsCreated} guests`);

  // 7. Update availability booked counts
  console.log('\n📊 Updating availability counts...');
  const { data: allBookings } = await supabase
    .from('bookings')
    .select('availability_id, guest_count, status')
    .neq('status', 'cancelled');

  const countsByAvail: Record<string, number> = {};
  allBookings?.forEach(b => {
    countsByAvail[b.availability_id] = (countsByAvail[b.availability_id] || 0) + b.guest_count;
  });

  for (const [availId, count] of Object.entries(countsByAvail)) {
    await supabase
      .from('availabilities')
      .update({ booked_count: count })
      .eq('id', availId);
  }
  console.log(`   ✅ Updated booked counts for ${Object.keys(countsByAvail).length} slots`);

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('✅ DATABASE SEEDING COMPLETE!');
  console.log('='.repeat(50));
  console.log('\n📊 Summary:');
  console.log(`   🚤 Boats: ${boatsData.length}`);
  console.log(`   🎯 Tours: ${toursData.length}`);
  console.log(`   👥 Staff: ${staffData?.length || 0}`);
  console.log(`   👤 Customers: ${customersData.length}`);
  console.log(`   📅 Availabilities: ${availData.length}`);
  console.log(`   📝 Bookings: ${bookingsCreated}`);
  console.log(`   🎫 Guests: ${guestsCreated}`);

  console.log('\n🎯 Test Scenarios Created:');
  console.log('   • Today: 3 bookings ready for check-in');
  console.log('   • Tomorrow: 3 bookings (incl. pending payment)');
  console.log('   • This week: Multiple upcoming bookings');
  console.log('   • Past: Completed, cancelled, and no-show examples');
  console.log('   • VIP, Corporate, Family tagged customers');

  console.log('\n🔑 Test Accounts:');
  console.log('   Admin: admin@tourpilot.com');
  console.log('   Captain: mike.rodriguez@tourpilot.com');
  console.log('   Captain: sarah.chen@tourpilot.com');
  console.log('   Guide: jake.thompson@tourpilot.com');

  console.log('\n✨ You can now test the application!\n');
}

// Main execution
async function main() {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 TourPilot Database Reset & Seed');
  console.log('='.repeat(50) + '\n');

  try {
    await cleanDatabase();
    await seedDatabase();
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
