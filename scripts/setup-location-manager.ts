import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://khfxgysyqhdssgvruayu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoZnhneXN5cWhkc3NndnJ1YXl1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU1Mzg0OCwiZXhwIjoyMDg4MTI5ODQ4fQ.tF3dgpCWYrWIUtdDQ5gE_kOUbej2VAtMG8Vhih9ZhC8'
);

// Configuration
const USER_EMAIL = 'affanzahir25@gmail.com';
const USER_PASSWORD = '123456';
const USER_NAME = 'Affan Zahir';
const LOCATION_2_ID = '20000000-0000-0000-0000-000000000002';

async function setupLocationManager() {
  console.log('Setting up Location Manager for Test Location 2...\n');

  // Step 1: Check if user already exists in auth
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(u => u.email === USER_EMAIL);

  let userId: string;

  if (existingUser) {
    console.log('User already exists in auth:', existingUser.id);
    userId = existingUser.id;

    // Update password if needed
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: USER_PASSWORD,
    });
    if (updateError) {
      console.log('Could not update password:', updateError.message);
    } else {
      console.log('Password updated');
    }
  } else {
    // Create new auth user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: USER_EMAIL,
      password: USER_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: USER_NAME,
      },
    });

    if (createError) {
      console.error('Failed to create user:', createError.message);
      return;
    }

    console.log('Created new auth user:', newUser.user.id);
    userId = newUser.user.id;
  }

  // Step 2: Check if staff record exists
  const { data: existingStaff } = await supabase
    .from('staff')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (existingStaff) {
    // Update existing staff record
    const { error: updateError } = await supabase
      .from('staff')
      .update({
        name: USER_NAME,
        email: USER_EMAIL,
        role: 'location_manager',
        location_id: LOCATION_2_ID,
        is_active: true,
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to update staff:', updateError.message);
      return;
    }
    console.log('Updated existing staff record');
  } else {
    // Create new staff record
    const { error: insertError } = await supabase.from('staff').insert({
      user_id: userId,
      name: USER_NAME,
      email: USER_EMAIL,
      phone: '+1-555-999-0001',
      role: 'location_manager',
      location_id: LOCATION_2_ID,
      is_active: true,
    });

    if (insertError) {
      console.error('Failed to create staff record:', insertError.message);
      return;
    }
    console.log('Created new staff record');
  }

  // Step 3: Verify location exists
  const { data: location } = await supabase
    .from('locations')
    .select('id, name, city, state')
    .eq('id', LOCATION_2_ID)
    .single();

  if (!location) {
    console.error('Location not found:', LOCATION_2_ID);
    return;
  }

  console.log('\n========================================');
  console.log('LOCATION MANAGER SETUP COMPLETE!');
  console.log('========================================');
  console.log('\nCredentials:');
  console.log('  Email:', USER_EMAIL);
  console.log('  Password:', USER_PASSWORD);
  console.log('\nAssigned Location:');
  console.log('  Name:', location.name);
  console.log('  City:', location.city);
  console.log('  State:', location.state);
  console.log('\nPermissions:');
  console.log('  - Full control over Test Location 2');
  console.log('  - Manage bookings, calendar, manifest');
  console.log('  - Manage tours, availability, pricing');
  console.log('  - Manage fleet/boats');
  console.log('  - Manage staff at this location');
  console.log('  - View compliance and trip logs');
  console.log('  - Access inbox and communications');
  console.log('  - Manage waivers and checklists');
  console.log('\nLogin at: /login');
}

setupLocationManager()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
