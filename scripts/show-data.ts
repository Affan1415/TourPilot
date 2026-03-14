import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function showData() {
  const { data: tours } = await supabase
    .from('tours')
    .select('id, name, base_price, max_capacity')
    .eq('status', 'active')
    .limit(5);

  console.log('\n🎯 Top 5 Tours Available:');
  tours?.forEach(t => {
    console.log(`   • ${t.name} - $${t.base_price}/person (max ${t.max_capacity} guests)`);
  });

  const { data: sample } = await supabase
    .from('bookings')
    .select(`
      booking_reference,
      guest_count,
      total_price,
      status,
      payment_status,
      checked_in,
      customer(first_name, last_name, email),
      availability(date, start_time, end_time, tour(name))
    `)
    .limit(3);

  console.log('\n📋 Sample Bookings:');
  sample?.forEach(b => {
    console.log(`   Booking ${b.booking_reference}:`);
    console.log(`     • Customer: ${b.customer?.first_name} ${b.customer?.last_name}`);
    console.log(`     • Tour: ${b.availability?.tour?.name}`);
    console.log(`     • Date: ${b.availability?.date} @ ${b.availability?.start_time}`);
    console.log(`     • Guests: ${b.guest_count} | Price: $${b.total_price}`);
    console.log(`     • Status: ${b.status} | Payment: ${b.payment_status}`);
  });
}

showData().catch(console.error);
