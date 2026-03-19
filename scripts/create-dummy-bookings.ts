import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://khfxgysyqhdssgvruayu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoZnhneXN5cWhkc3NndnJ1YXl1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU1Mzg0OCwiZXhwIjoyMDg4MTI5ODQ4fQ.tF3dgpCWYrWIUtdDQ5gE_kOUbej2VAtMG8Vhih9ZhC8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createDummyBookings() {
  console.log('Creating dummy bookings for Dolphin Watch Adventure...\n');

  // Find the tour
  const { data: tour, error: tourError } = await supabase
    .from('tours')
    .select('id, name')
    .ilike('name', '%dolphin watch adventure%')
    .limit(1)
    .single();

  if (tourError || !tour) {
    console.error('Tour not found:', tourError);
    return;
  }

  console.log(`Found tour: ${tour.name} (${tour.id})`);

  // Get today's date (force to 2026-03-19 for testing)
  const today = '2026-03-19';

  // Find or create availability for today
  let { data: availability, error: availError } = await supabase
    .from('availabilities')
    .select('id, date, start_time, end_time, booked_count')
    .eq('tour_id', tour.id)
    .eq('date', today)
    .single();

  if (!availability) {
    // Create availability for today
    const { data: newAvail, error: createError } = await supabase
      .from('availabilities')
      .insert({
        tour_id: tour.id,
        date: today,
        start_time: '09:00:00',
        end_time: '12:00:00',
        status: 'available',
        booked_count: 0,
      })
      .select()
      .single();

    if (createError || !newAvail) {
      console.error('Error creating availability:', createError);
      return;
    }
    availability = newAvail;
    console.log(`Created availability for today: ${availability!.id}`);
  } else {
    console.log(`Found existing availability: ${availability.id}`);
  }

  // Sample customers and guests data
  const bookingsData = [
    {
      customer: {
        first_name: 'John',
        last_name: 'Smith',
        email: 'john.smith@example.com',
        phone: '+1-555-0101',
      },
      guests: [
        { first_name: 'John', last_name: 'Smith', email: 'john.smith@example.com' },
        { first_name: 'Sarah', last_name: 'Smith', email: 'sarah.smith@example.com' },
      ],
      notes: 'Anniversary trip - please wish them well!',
    },
    {
      customer: {
        first_name: 'Maria',
        last_name: 'Garcia',
        email: 'maria.garcia@example.com',
        phone: '+1-555-0102',
      },
      guests: [
        { first_name: 'Maria', last_name: 'Garcia', email: 'maria.garcia@example.com' },
        { first_name: 'Carlos', last_name: 'Garcia', email: null },
        { first_name: 'Sofia', last_name: 'Garcia', email: null },
      ],
      notes: 'Family with young child (Sofia, age 8)',
    },
    {
      customer: {
        first_name: 'David',
        last_name: 'Johnson',
        email: 'david.j@example.com',
        phone: '+1-555-0103',
      },
      guests: [
        { first_name: 'David', last_name: 'Johnson', email: 'david.j@example.com' },
        { first_name: 'Emily', last_name: 'Johnson', email: 'emily.j@example.com' },
        { first_name: 'Michael', last_name: 'Johnson', email: null },
        { first_name: 'Emma', last_name: 'Johnson', email: null },
      ],
      notes: null,
    },
    {
      customer: {
        first_name: 'Robert',
        last_name: 'Williams',
        email: 'rob.williams@example.com',
        phone: '+1-555-0104',
      },
      guests: [
        { first_name: 'Robert', last_name: 'Williams', email: 'rob.williams@example.com' },
      ],
      notes: 'Solo traveler, requested front seat',
    },
    {
      customer: {
        first_name: 'Jennifer',
        last_name: 'Brown',
        email: 'jenny.brown@example.com',
        phone: '+1-555-0105',
      },
      guests: [
        { first_name: 'Jennifer', last_name: 'Brown', email: 'jenny.brown@example.com' },
        { first_name: 'Lisa', last_name: 'Brown', email: 'lisa.b@example.com' },
      ],
      notes: 'Sisters trip - celebrating birthday',
    },
  ];

  let totalGuests = 0;

  for (const bookingData of bookingsData) {
    // Create or find customer
    let { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', bookingData.customer.email)
      .single();

    if (!customer) {
      const { data: newCustomer, error: custError } = await supabase
        .from('customers')
        .insert(bookingData.customer)
        .select()
        .single();

      if (custError || !newCustomer) {
        console.error('Error creating customer:', custError);
        continue;
      }
      customer = newCustomer;
    }

    // Generate booking reference
    const bookingRef = `DW${today.replace(/-/g, '')}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        customer_id: customer!.id,
        availability_id: availability!.id,
        booking_reference: bookingRef,
        status: 'confirmed',
        guest_count: bookingData.guests.length,
        total_price: bookingData.guests.length * 75, // $75 per person
        payment_status: 'paid',
        notes: bookingData.notes,
      })
      .select()
      .single();

    if (bookingError) {
      console.error('Error creating booking:', bookingError);
      continue;
    }

    console.log(`Created booking: ${bookingRef} for ${bookingData.customer.first_name} ${bookingData.customer.last_name}`);

    // Create booking guests
    for (const guest of bookingData.guests) {
      const { error: guestError } = await supabase
        .from('booking_guests')
        .insert({
          booking_id: booking.id,
          first_name: guest.first_name,
          last_name: guest.last_name,
          email: guest.email,
          checked_in: false,
        });

      if (guestError) {
        console.error('Error creating guest:', guestError);
      } else {
        totalGuests++;
      }
    }
  }

  // Update availability booked_count
  await supabase
    .from('availabilities')
    .update({ booked_count: totalGuests })
    .eq('id', availability!.id);

  console.log(`\n✅ Created ${bookingsData.length} bookings with ${totalGuests} total guests`);
  console.log(`📅 Date: ${today}`);
  console.log(`🚢 Tour: ${tour.name}`);
  console.log(`🆔 Availability ID: ${availability!.id}`);
}

createDummyBookings()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
