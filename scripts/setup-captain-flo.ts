import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://khfxgysyqhdssgvruayu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoZnhneXN5cWhkc3NndnJ1YXl1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU1Mzg0OCwiZXhwIjoyMDg4MTI5ODQ4fQ.tF3dgpCWYrWIUtdDQ5gE_kOUbej2VAtMG8Vhih9ZhC8'
);

const CAPTAIN_STAFF_ID = 'faa5ffdb-30e3-4497-911f-e50bd4e9e844';
const WAIVER_TEMPLATE_ID = '8e88adae-c3c7-4f13-b8e3-8c99b058ed89';
const today = '2026-03-19';

const bookingsData = [
  {
    customer: { first_name: 'Mike', last_name: 'Thompson', email: 'mike.t@example.com', phone: '+1-555-0201' },
    guests: [
      { first_name: 'Mike', last_name: 'Thompson', email: 'mike.t@example.com' },
      { first_name: 'Lisa', last_name: 'Thompson', email: 'lisa.t@example.com' },
    ],
    notes: 'Honeymoon couple - special occasion!',
  },
  {
    customer: { first_name: 'James', last_name: 'Wilson', email: 'james.w@example.com', phone: '+1-555-0202' },
    guests: [
      { first_name: 'James', last_name: 'Wilson', email: 'james.w@example.com' },
      { first_name: 'Emma', last_name: 'Wilson', email: null },
      { first_name: 'Jack', last_name: 'Wilson', email: null },
    ],
    notes: 'Family with 2 kids (ages 10 and 12)',
  },
  {
    customer: { first_name: 'Sarah', last_name: 'Davis', email: 'sarah.d@example.com', phone: '+1-555-0203' },
    guests: [
      { first_name: 'Sarah', last_name: 'Davis', email: 'sarah.d@example.com' },
    ],
    notes: null,
  },
  {
    customer: { first_name: 'Chris', last_name: 'Martinez', email: 'chris.m@example.com', phone: '+1-555-0204' },
    guests: [
      { first_name: 'Chris', last_name: 'Martinez', email: 'chris.m@example.com' },
      { first_name: 'Ana', last_name: 'Martinez', email: 'ana.m@example.com' },
      { first_name: 'Carlos', last_name: 'Martinez', email: null },
      { first_name: 'Maria', last_name: 'Martinez', email: null },
    ],
    notes: 'Celebrating grandparents anniversary',
  },
];

async function createBookingsForAvailability(availabilityId: string, tourName: string) {
  // Clear old data
  const { data: oldBookings } = await supabase
    .from('bookings')
    .select('id')
    .eq('availability_id', availabilityId);

  if (oldBookings && oldBookings.length > 0) {
    const ids = oldBookings.map((b: any) => b.id);
    await supabase.from('waivers').delete().in('booking_id', ids);
    await supabase.from('booking_guests').delete().in('booking_id', ids);
    await supabase.from('bookings').delete().in('id', ids);
  }
  await supabase.from('trip_logs').delete().eq('availability_id', availabilityId);
  await supabase.from('checklist_completions').delete().eq('availability_id', availabilityId);

  let guestCount = 0;
  const prefix = tourName.includes('Sunset') ? 'SH' : tourName.includes('Dolphin') ? 'DW' : 'TR';

  for (const bd of bookingsData) {
    let { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', bd.customer.email)
      .single();

    if (!customer) {
      const { data: c } = await supabase.from('customers').insert(bd.customer).select().single();
      customer = c;
    }

    const ref = prefix + today.replace(/-/g, '') + Math.random().toString(36).substring(2, 6).toUpperCase();
    const { data: booking } = await supabase
      .from('bookings')
      .insert({
        customer_id: customer!.id,
        availability_id: availabilityId,
        booking_reference: ref,
        status: 'confirmed',
        guest_count: bd.guests.length,
        total_price: bd.guests.length * 95,
        payment_status: 'paid',
        notes: bd.notes,
      })
      .select()
      .single();

    for (const g of bd.guests) {
      const { data: guest } = await supabase
        .from('booking_guests')
        .insert({
          booking_id: booking!.id,
          first_name: g.first_name,
          last_name: g.last_name,
          email: g.email,
          checked_in: false,
        })
        .select()
        .single();

      await supabase.from('waivers').insert({
        booking_id: booking!.id,
        guest_id: guest!.id,
        waiver_template_id: WAIVER_TEMPLATE_ID,
        status: 'pending',
      });
      guestCount++;
    }
  }

  await supabase.from('availabilities').update({ booked_count: guestCount }).eq('id', availabilityId);
  return guestCount;
}

async function setup() {
  console.log('Setting up full dummy data for Captain Flo (captain@yetti.ai)...\n');

  // Get tours
  const { data: sunsetTour } = await supabase
    .from('tours')
    .select('id, name')
    .eq('name', 'Sunset Harbor Cruise')
    .single();

  const { data: dolphinTour } = await supabase
    .from('tours')
    .select('id, name')
    .eq('name', 'Dolphin Watch Adventure')
    .single();

  console.log('Sunset tour:', sunsetTour?.name, sunsetTour?.id);
  console.log('Dolphin tour:', dolphinTour?.name, dolphinTour?.id);

  if (!sunsetTour || !dolphinTour) {
    console.log('Tours not found!');
    return;
  }

  // Enable waivers
  await supabase.from('tours').update({ requires_waiver: true }).eq('id', sunsetTour.id);
  await supabase.from('tours').update({ requires_waiver: true }).eq('id', dolphinTour.id);

  // Clear old assignments
  await supabase.from('availability_staff').delete().eq('staff_id', CAPTAIN_STAFF_ID);
  console.log('\nCleared old captain assignments');

  // Schedule
  const schedule = [
    { tour: dolphinTour, date: '2026-03-19', startTime: '09:00:00', endTime: '12:00:00', createBookings: true },
    { tour: sunsetTour, date: '2026-03-19', startTime: '17:00:00', endTime: '20:00:00', createBookings: true },
    { tour: sunsetTour, date: '2026-03-20', startTime: '17:00:00', endTime: '20:00:00', createBookings: false },
    { tour: dolphinTour, date: '2026-03-21', startTime: '09:00:00', endTime: '12:00:00', createBookings: false },
    { tour: sunsetTour, date: '2026-03-22', startTime: '17:00:00', endTime: '20:00:00', createBookings: false },
  ];

  for (const sched of schedule) {
    // Find or create availability
    let { data: avail } = await supabase
      .from('availabilities')
      .select('id')
      .eq('tour_id', sched.tour.id)
      .eq('date', sched.date)
      .single();

    if (!avail) {
      const { data: newAvail } = await supabase
        .from('availabilities')
        .insert({
          tour_id: sched.tour.id,
          date: sched.date,
          start_time: sched.startTime,
          end_time: sched.endTime,
          status: 'available',
          booked_count: 0,
        })
        .select()
        .single();
      avail = newAvail;
      console.log('Created availability for', sched.tour.name, 'on', sched.date);
    }

    // Assign captain
    const { error: assignError } = await supabase.from('availability_staff').insert({
      availability_id: avail!.id,
      staff_id: CAPTAIN_STAFF_ID,
      role: 'captain',
    });

    if (assignError && !assignError.message.includes('duplicate')) {
      console.log('Assignment error:', assignError.message);
    }

    console.log('Assigned:', sched.tour.name, 'on', sched.date, sched.startTime.slice(0, 5));

    if (sched.createBookings) {
      const guests = await createBookingsForAvailability(avail!.id, sched.tour.name);
      console.log('  -> Created bookings with', guests, 'guests');
    }
  }

  console.log('\n========================================');
  console.log('SETUP COMPLETE FOR CAPTAIN FLO!');
  console.log('========================================');
  console.log('\nToday (Mar 19):');
  console.log('  - Dolphin Watch Adventure 9:00 AM (10 guests)');
  console.log('  - Sunset Harbor Cruise 5:00 PM (10 guests)');
  console.log('\nUpcoming:');
  console.log('  - Mar 20: Sunset Harbor Cruise');
  console.log('  - Mar 21: Dolphin Watch Adventure');
  console.log('  - Mar 22: Sunset Harbor Cruise');
  console.log('\nAll waivers are pending. Ready to test!');
}

setup()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
