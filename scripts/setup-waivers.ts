import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://khfxgysyqhdssgvruayu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoZnhneXN5cWhkc3NndnJ1YXl1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU1Mzg0OCwiZXhwIjoyMDg4MTI5ODQ4fQ.tF3dgpCWYrWIUtdDQ5gE_kOUbej2VAtMG8Vhih9ZhC8'
);

const WAIVER_TEMPLATE_ID = '8e88adae-c3c7-4f13-b8e3-8c99b058ed89';
const AVAILABILITY_ID = 'd9277668-e749-4a3a-aa49-5c3001b1a550';

async function setupWaivers() {
  console.log('Setting up waivers for Dolphin Watch Adventure...\n');

  // Get tour
  const { data: tour } = await supabase
    .from('tours')
    .select('*')
    .ilike('name', '%dolphin watch adventure%')
    .single();

  if (!tour) {
    console.log('Tour not found');
    return;
  }

  console.log('Tour:', tour.id, tour.name);
  console.log('Current requires_waiver:', tour.requires_waiver);

  // Update tour to require waiver
  const { error: updateError } = await supabase
    .from('tours')
    .update({
      requires_waiver: true,
      waiver_template_id: WAIVER_TEMPLATE_ID
    })
    .eq('id', tour.id);

  if (updateError) {
    console.log('Error updating tour:', updateError);
  } else {
    console.log('Tour updated to require waiver');
  }

  // Get bookings for today's availability
  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      id,
      booking_reference,
      booking_guests (
        id,
        first_name,
        last_name
      )
    `)
    .eq('availability_id', AVAILABILITY_ID);

  console.log('\nBookings found:', bookings?.length);

  let created = 0;
  let skipped = 0;

  // Create waiver records for each guest
  for (const booking of bookings || []) {
    const guests = (booking as any).booking_guests || [];
    for (const guest of guests) {
      // Check if waiver already exists
      const { data: existing } = await supabase
        .from('waivers')
        .select('id')
        .eq('booking_id', booking.id)
        .eq('guest_id', guest.id)
        .single();

      if (existing) {
        console.log('Waiver exists for', guest.first_name, guest.last_name);
        skipped++;
        continue;
      }

      const { error } = await supabase
        .from('waivers')
        .insert({
          booking_id: booking.id,
          guest_id: guest.id,
          waiver_template_id: WAIVER_TEMPLATE_ID,
          status: 'pending'
        });

      if (error) {
        console.log('Error creating waiver for', guest.first_name, ':', error.message);
      } else {
        console.log('Created waiver for', guest.first_name, guest.last_name);
        created++;
      }
    }
  }

  console.log(`\n✅ Done! Created ${created} waivers, skipped ${skipped} existing`);
}

setupWaivers()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
