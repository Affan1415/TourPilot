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

async function resetCaptainTour(captainEmail: string) {
  console.log(`🔄 Resetting tour for ${captainEmail}\n`);

  try {
    // 1. Find the captain/staff member
    console.log('👤 Finding captain...');
    const { data: captain, error: captainError } = await supabase
      .from('staff')
      .select('id, name, email')
      .eq('email', captainEmail)
      .single();

    if (captainError || !captain) {
      console.error(`❌ Captain not found with email ${captainEmail}`);
      return;
    }
    console.log(`✅ Found: ${captain.name} (${captain.email})\n`);

    // 2. Find today's availabilities assigned to this captain
    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Finding today's tours (${today})...`);

    const { data: assignments, error: assignError } = await supabase
      .from('availability_staff')
      .select(`
        availability_id,
        availabilities!inner (
          id,
          date,
          start_time,
          end_time,
          tours (
            id,
            name
          )
        )
      `)
      .eq('staff_id', captain.id)
      .eq('availabilities.date', today);

    if (assignError) {
      console.error('❌ Error finding assignments:', assignError);
      return;
    }

    if (!assignments || assignments.length === 0) {
      console.log('❌ No tours found for today');
      return;
    }

    console.log(`✅ Found ${assignments.length} tour(s) for today\n`);

    // 3. Reset each tour
    for (const assignment of assignments) {
      const avail = assignment.availabilities as any;
      const tour = avail.tours;

      console.log(`\n🚤 Resetting: ${tour.name} (${avail.start_time} - ${avail.end_time})`);

      // Delete existing trip_log for this availability
      const { error: deleteError } = await supabase
        .from('trip_logs')
        .delete()
        .eq('availability_id', avail.id)
        .eq('captain_id', captain.id);

      if (deleteError) {
        console.log(`   ⚠️ Could not delete trip_log: ${deleteError.message}`);
      } else {
        console.log('   ✅ Deleted trip_log');
      }

      // Delete checklist completions for this availability
      const { error: checklistError } = await supabase
        .from('checklist_completions')
        .delete()
        .eq('availability_id', avail.id);

      if (checklistError) {
        console.log(`   ⚠️ Could not delete checklist_completions: ${checklistError.message}`);
      } else {
        console.log('   ✅ Deleted checklist completions');
      }

      // Get all bookings for this availability
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('availability_id', avail.id);

      if (bookings && bookings.length > 0) {
        const bookingIds = bookings.map(b => b.id);

        // Reset booking check-in status
        const { error: bookingResetError } = await supabase
          .from('bookings')
          .update({
            checked_in: false,
            checked_in_at: null,
            status: 'confirmed'
          })
          .in('id', bookingIds);

        if (bookingResetError) {
          console.log(`   ⚠️ Could not reset bookings: ${bookingResetError.message}`);
        } else {
          console.log(`   ✅ Reset ${bookings.length} booking(s) check-in status`);
        }

        // Reset all guest check-ins
        const { error: guestResetError } = await supabase
          .from('booking_guests')
          .update({ checked_in: false })
          .in('booking_id', bookingIds);

        if (guestResetError) {
          console.log(`   ⚠️ Could not reset guest check-ins: ${guestResetError.message}`);
        } else {
          console.log('   ✅ Reset all guest check-ins');
        }

        // Reset waivers to pending
        const { error: waiverResetError } = await supabase
          .from('waivers')
          .update({
            status: 'pending',
            signed_at: null,
            signature_url: null
          })
          .in('booking_id', bookingIds);

        if (waiverResetError) {
          console.log(`   ⚠️ Could not reset waivers: ${waiverResetError.message}`);
        } else {
          console.log('   ✅ Reset waivers to pending');
        }
      }
    }

    console.log('\n✅ Tour reset complete!');
    console.log(`\n🎯 ${captainEmail} can now start fresh with:`);
    console.log('   ✓ No active trip log');
    console.log('   ✓ All guests unchecked');
    console.log('   ✓ All waivers pending');
    console.log('   ✓ Checklists cleared');

  } catch (error) {
    console.error('❌ Error resetting tour:', error);
    process.exit(1);
  }
}

// Get captain email from command line or use default
const captainEmail = process.argv[2] || 'captain@yetti.ai';
resetCaptainTour(captainEmail);
