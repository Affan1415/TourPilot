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

async function checkData() {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const { count: tourCount } = await supabase
    .from('tours')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  const { count: availCount } = await supabase
    .from('availabilities')
    .select('*', { count: 'exact', head: true })
    .gte('date', startDate)
    .lte('date', endDate);

  const { count: bookingCount } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true });

  const { count: custCount } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true });

  console.log('\n📊 Database Summary:');
  console.log(`   Active Tours: ${tourCount}`);
  console.log(`   Availabilities (${startDate} to ${endDate}): ${availCount}`);
  console.log(`   Total Bookings: ${bookingCount}`);
  console.log(`   Total Customers: ${custCount}`);

  // Get a sample booking with related data
  const { data: sampleBooking } = await supabase
    .from('bookings')
    .select('*, customer(*), availability(*, tour(*))')
    .limit(1)
    .single();

  if (sampleBooking) {
    console.log('\n📍 Sample Booking:');
    console.log(`   Ref: ${sampleBooking.booking_reference}`);
    console.log(`   Customer: ${sampleBooking.customer?.first_name} ${sampleBooking.customer?.last_name}`);
    console.log(`   Tour: ${sampleBooking.availability?.tour?.name}`);
    console.log(`   Date: ${sampleBooking.availability?.date}`);
    console.log(`   Guests: ${sampleBooking.guest_count}`);
    console.log(`   Status: ${sampleBooking.status}`);
    console.log(`   Payment: ${sampleBooking.payment_status}`);
  }
}

checkData().catch(console.error);
