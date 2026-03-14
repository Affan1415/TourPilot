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

// Sample customer data for captain account
const sampleCustomers = [
  { first_name: 'John', last_name: 'Smith', email: 'john.smith@example.com', phone: '+14155552671', country_code: 'US' },
  { first_name: 'Sarah', last_name: 'Johnson', email: 'sarah.j@example.com', phone: '+14155552672', country_code: 'US' },
  { first_name: 'Michael', last_name: 'Chen', email: 'mchen@example.com', phone: '+14155552673', country_code: 'CA' },
  { first_name: 'Emma', last_name: 'Wilson', email: 'emma.w@example.com', phone: '+14155552674', country_code: 'UK' },
  { first_name: 'David', last_name: 'Garcia', email: 'david.g@example.com', phone: '+34123456789', country_code: 'ES' },
  { first_name: 'Lisa', last_name: 'Martinez', email: 'lisa.m@example.com', phone: '+34987654321', country_code: 'ES' },
];

const guestNames = [
  { first: 'James', last: 'Anderson' },
  { first: 'Patricia', last: 'Taylor' },
  { first: 'Robert', last: 'Moore' },
  { first: 'Jennifer', last: 'Jackson' },
  { first: 'William', last: 'White' },
  { first: 'Linda', last: 'Harris' },
  { first: 'Charles', last: 'Martin' },
  { first: 'Barbara', last: 'Thompson' },
];

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function generateCaptainData() {
  console.log('🚀 Generating test data for affanzahir19@gmail.com (affan cap)\n');

  try {
    // 1. Get the captain
    console.log('👤 Finding captain account...');
    const { data: captain, error: captainError } = await supabase
      .from('staff')
      .select('id, name, email')
      .eq('email', 'affanzahir19@gmail.com')
      .single();

    if (captainError || !captain) {
      console.error('❌ Captain not found with email affanzahir19@gmail.com');
      return;
    }
    console.log(`✅ Found: ${captain.name} (${captain.email})\n`);

    // 2. Get tours for assignments
    console.log('📍 Loading tours...');
    const { data: tours } = await supabase
      .from('tours')
      .select('id, name, base_price, max_capacity, min_guests, duration_minutes')
      .eq('status', 'active')
      .limit(3);

    if (!tours || tours.length === 0) {
      console.error('❌ No active tours found');
      return;
    }
    console.log(`✅ Found ${tours.length} tours\n`);

    // 3. Create availabilities for next 7 days with captain assigned
    console.log('📅 Creating availabilities with captain assignment...');
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + 1); // Start from tomorrow

    const availabilities = [];
    let assignmentCount = 0;

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDate = new Date(baseDate);
      currentDate.setDate(currentDate.getDate() + dayOffset);
      const dateStr = currentDate.toISOString().split('T')[0];

      for (const tour of tours!) {
        // Create 1-2 time slots per day per tour
        const numSlots = getRandomInt(1, 2);

        for (let slot = 0; slot < numSlots; slot++) {
          const startHour = slot === 0 ? getRandomInt(9, 10) : getRandomInt(14, 15);
          const endHour = startHour + Math.ceil(tour.duration_minutes / 60);

          const { data: availability, error: availError } = await supabase
            .from('availabilities')
            .insert({
              tour_id: tour.id,
              date: dateStr,
              start_time: `${String(startHour).padStart(2, '0')}:00`,
              end_time: `${String(endHour).padStart(2, '0')}:00`,
              price_override: null,
              capacity_override: null,
              status: 'available'
            })
            .select()
            .single();

          if (availError) {
            // Availability might already exist, skip
            continue;
          }

          // Assign captain to this availability
          const { error: assignError } = await supabase
            .from('availability_staff')
            .insert({
              availability_id: availability.id,
              staff_id: captain.id,
              role: 'captain'
            });

          if (!assignError) {
            assignmentCount++;
            availabilities.push(availability);
          }
        }
      }
    }

    console.log(`✅ Created/assigned ${assignmentCount} time slots to captain\n`);

    // 4. Create bookings for these availabilities
    console.log('📋 Creating bookings for captain\'s tours...');
    let bookingCount = 0;

    for (const availability of availabilities) {
      // Get the tour details
      const { data: tourData } = await supabase
        .from('tours')
        .select('id, name, base_price, max_capacity, min_guests, requires_waiver')
        .eq('id', availability.tour_id)
        .single();

      if (!tourData) continue;

      // Create 2-3 random bookings per availability
      const numBookings = getRandomInt(2, 3);

      for (let b = 0; b < numBookings; b++) {
        const customer = getRandomItem(sampleCustomers);
        const guestCount = getRandomInt(tourData.min_guests, Math.min(3, tourData.max_capacity));

        // Create or get customer
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('email', customer.email)
          .single();

        let customerId = existingCustomer?.id;

        if (!customerId) {
          const { data: newCustomer, error: custError } = await supabase
            .from('customers')
            .insert({
              email: customer.email,
              first_name: customer.first_name,
              last_name: customer.last_name,
              phone: customer.phone,
              country_code: customer.country_code,
              notes: 'Captain test booking',
              tags: []
            })
            .select('id')
            .single();

          if (custError) continue;
          customerId = newCustomer.id;
        }

        // Create booking
        const totalPrice = tourData.base_price * guestCount;
        const bookingStatuses = ['confirmed', 'checked_in', 'completed'] as const;
        const bookingStatus = getRandomItem(bookingStatuses);

        const { data: booking, error: bookError } = await supabase
          .from('bookings')
          .insert({
            customer_id: customerId,
            availability_id: availability.id,
            guest_count: guestCount,
            total_price: totalPrice,
            status: bookingStatus,
            payment_status: 'paid',
            checked_in: bookingStatus === 'checked_in' || bookingStatus === 'completed',
            checked_in_at: (bookingStatus === 'checked_in' || bookingStatus === 'completed')
              ? new Date().toISOString()
              : null,
            notes: 'Captain booking test'
          })
          .select()
          .single();

        if (bookError) continue;
        bookingCount++;

        // Create booking guests
        for (let g = 0; g < guestCount; g++) {
          const guest = getRandomItem(guestNames);
          await supabase
            .from('booking_guests')
            .insert({
              booking_id: booking.id,
              first_name: guest.first,
              last_name: guest.last,
              email: g === 0 ? customer.email : null,
              is_primary: g === 0,
              checked_in: booking.checked_in
            });
        }

        // Create waivers if needed
        if (tourData.requires_waiver) {
          const { data: waiverTemplate } = await supabase
            .from('waiver_templates')
            .select('id')
            .eq('is_active', true)
            .single();

          if (waiverTemplate) {
            for (let g = 0; g < guestCount; g++) {
              const isSigned = bookingStatus === 'checked_in' || bookingStatus === 'completed';
              await supabase
                .from('waivers')
                .insert({
                  booking_id: booking.id,
                  guest_id: g,
                  waiver_template_id: waiverTemplate.id,
                  status: isSigned ? 'signed' : 'pending',
                  signed_at: isSigned ? new Date().toISOString() : null,
                  signature_url: isSigned ? 'https://example.com/signature.png' : null
                });
            }
          }
        }
      }
    }

    console.log(`✅ Created ${bookingCount} bookings\n`);

    // 5. Summary
    console.log('✅ Test data generation complete!\n');
    console.log('📊 Summary for affanzahir19@gmail.com:');
    console.log(`   • Time slots assigned: ${assignmentCount}`);
    console.log(`   • Bookings created: ${bookingCount}`);
    console.log(`   • Customers: ${sampleCustomers.length}`);
    console.log(`   • Tours covered: ${tours.length}`);
    console.log(`\n🎯 Login with affanzahir19@gmail.com to see:`);
    console.log(`   ✓ Assigned tours in captain dashboard`);
    console.log(`   ✓ Bookings with guests to check in`);
    console.log(`   ✓ Various booking statuses (confirmed, checked-in, completed)`);

  } catch (error) {
    console.error('❌ Error generating captain data:', error);
    process.exit(1);
  }
}

generateCaptainData();
