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

// Sample tour data
const sampleTours = [
  {
    name: 'City Walking Tour',
    slug: 'city-walking-tour',
    description: 'Explore the historic city center with our expert guides',
    short_description: 'Historic city walking tour',
    duration_minutes: 120,
    base_price: 45,
    max_capacity: 15,
    min_guests: 2,
    images: ['https://images.unsplash.com/photo-1488646953014-85cb44e25828'],
    location: 'Downtown',
    meeting_point: 'City Hall Plaza',
    what_to_bring: ['Comfortable shoes', 'Water bottle', 'Camera'],
    includes: ['Professional guide', 'Maps', 'Historical insights'],
    requires_waiver: false,
    status: 'active' as const
  },
  {
    name: 'Mountain Hiking Adventure',
    slug: 'mountain-hiking-adventure',
    description: 'Challenging mountain trek with breathtaking views',
    short_description: 'Adventure hiking in the mountains',
    duration_minutes: 240,
    base_price: 75,
    max_capacity: 10,
    min_guests: 2,
    images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4'],
    location: 'Mountain Range',
    meeting_point: 'Mountain Lodge',
    what_to_bring: ['Hiking boots', 'Backpack', 'Water', 'Sunscreen'],
    includes: ['Guide', 'Maps', 'Safety equipment'],
    requires_waiver: true,
    status: 'active' as const
  },
  {
    name: 'Beach Sunset Tour',
    slug: 'beach-sunset-tour',
    description: 'Relax and enjoy the beautiful sunset at the beach',
    short_description: 'Sunset beach experience',
    duration_minutes: 90,
    base_price: 35,
    max_capacity: 20,
    min_guests: 1,
    images: ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e'],
    location: 'Coastal Beach',
    meeting_point: 'Main Beach Entrance',
    what_to_bring: ['Light jacket', 'Camera'],
    includes: ['Guided tour', 'Photo opportunities'],
    requires_waiver: false,
    status: 'active' as const
  },
  {
    name: 'Food & Wine Tasting',
    slug: 'food-wine-tasting',
    description: 'Culinary tour with local food and wine tastings',
    short_description: 'Local food and wine experience',
    duration_minutes: 150,
    base_price: 95,
    max_capacity: 12,
    min_guests: 4,
    images: ['https://images.unsplash.com/photo-1504674900769-7696b88e3540'],
    location: 'Downtown District',
    meeting_point: 'Central Market',
    what_to_bring: ['Appetite', 'Comfortable clothes'],
    includes: ['Food tastings', 'Wine samples', 'Chef guide'],
    requires_waiver: false,
    status: 'active' as const
  }
];

// Sample customer names
const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emma', 'Robert', 'Lisa', 'James', 'Maria'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
const countries = ['US', 'UK', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES', 'JP', 'BR'];

function generateEmail(first: string, last: string): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 10000);
  return `${first.toLowerCase()}.${last.toLowerCase()}${timestamp}${random}@example.com`;
}

function generatePhone(): string {
  return `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`;
}

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function generateTestData() {
  console.log('🚀 Starting test data generation...\n');

  try {
    // 1. Get staff (captains and guides)
    console.log('📋 Fetching staff members...');
    const { data: staffList, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('is_active', true);

    if (staffError) throw staffError;
    console.log(`✅ Found ${staffList?.length || 0} active staff members`);
    console.log(staffList?.map(s => `   - ${s.name} (${s.role})`).join('\n'));

    const guides = staffList?.filter(s => ['guide', 'captain'].includes(s.role)) || [];

    if (guides.length === 0) {
      console.error('❌ No guides or captains found. Please add staff first.');
      return;
    }

    // 2. Get or create tours
    console.log('\n📍 Getting existing tours...');
    const { data: existingTours } = await supabase
      .from('tours')
      .select('*')
      .eq('status', 'active');

    let tours = existingTours || [];

    if (tours.length === 0) {
      console.log('   No tours found, creating new ones...');
      const { data: newTours, error: tourError } = await supabase
        .from('tours')
        .insert(sampleTours)
        .select();

      if (tourError) throw tourError;
      tours = newTours || [];
    }

    console.log(`✅ Using ${tours.length} tours`);

    // 3. Get or create availabilities and bookings for the whole month
    console.log('\n📅 Generating bookings for the month...');

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Generate for the current month
    const startDate = new Date(currentYear, currentMonth, 1);
    const endDate = new Date(currentYear, currentMonth + 1, 0);

    const bookings: any[] = [];
    let availabilityCount = 0;

    // Get existing availabilities
    const { data: existingAvailabilities } = await supabase
      .from('availabilities')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0]);

    availabilityCount = existingAvailabilities?.length || 0;

    // If no availabilities exist, create them
    if (availabilityCount === 0) {
      console.log('   Creating availabilities for the month...');

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];

        for (const tour of tours!) {
          const numSlots = getRandomInt(1, 2);

          for (let slot = 0; slot < numSlots; slot++) {
            const startHour = slot === 0 ? getRandomInt(8, 11) : getRandomInt(13, 16);
            const endHour = startHour + Math.floor(tour.duration_minutes / 60);

            const { data: availData, error: availError } = await supabase
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

            if (availError) throw availError;
            const availability = availData;
            availabilityCount++;

            // Assign a random guide/captain to this availability
            const assignedGuide = getRandomItem(guides);
            await supabase
              .from('availability_staff')
              .insert({
                availability_id: availability.id,
                staff_id: assignedGuide.id,
                role: assignedGuide.role
              });
          }
        }
      }
    }

    // Now create bookings for existing availabilities
    console.log(`   Creating bookings for ${existingAvailabilities?.length || availabilityCount} availabilities...`);

    const availsToBook = existingAvailabilities || (await supabase
      .from('availabilities')
      .select('*, tour:tours(*)')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])).data || [];

    for (const availability of availsToBook) {
      const tour = availability.tour;
      if (!tour) continue;

      // Check if this availability already has bookings
      const { data: existingBookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('availability_id', availability.id);

      if ((existingBookings?.length || 0) > 0) continue;

      // Create 2-5 random bookings for this availability
      const numBookings = getRandomInt(2, Math.min(5, tour.max_capacity));

      for (let b = 0; b < numBookings; b++) {
        const guestCount = getRandomInt(tour.min_guests, Math.min(4, tour.max_capacity));
        const firstName = getRandomItem(firstNames);
        const lastName = getRandomItem(lastNames);
        const countryCode = getRandomItem(countries);

        // Create customer
        const { data: customer, error: custError } = await supabase
          .from('customers')
          .insert({
            email: generateEmail(firstName, lastName),
            first_name: firstName,
            last_name: lastName,
            phone: generatePhone(),
            country_code: countryCode,
            notes: getRandomItem(['Regular customer', 'First time', 'Referred by friend', null]),
            tags: []
          })
          .select()
          .single();

        if (custError) throw custError;

        // Create booking
        const totalPrice = tour.base_price * guestCount * (getRandomInt(80, 110) / 100);
        const bookingStatus = getRandomItem(['pending', 'confirmed', 'checked_in', 'completed'] as const);
        const paymentStatus = bookingStatus === 'pending' ? 'pending' : 'paid';

        const { data: booking, error: bookError } = await supabase
          .from('bookings')
          .insert({
            customer_id: customer.id,
            availability_id: availability.id,
            guest_count: guestCount,
            total_price: Math.round(totalPrice * 100) / 100,
            status: bookingStatus,
            payment_status: paymentStatus,
            checked_in: bookingStatus === 'checked_in' || bookingStatus === 'completed',
            checked_in_at: (bookingStatus === 'checked_in' || bookingStatus === 'completed')
              ? new Date().toISOString()
              : null,
            notes: getRandomItem(['VIP guest', 'Group booking', null])
          })
          .select()
          .single();

        if (bookError) throw bookError;
        bookings.push(booking);

        // Create booking guests
        for (let g = 0; g < guestCount; g++) {
          const guestFirst = getRandomItem(firstNames);
          const guestLast = getRandomItem(lastNames);

          const { error: guestError } = await supabase
            .from('booking_guests')
            .insert({
              booking_id: booking.id,
              first_name: guestFirst,
              last_name: guestLast,
              email: g === 0 ? customer.email : null,
              is_primary: g === 0,
              checked_in: booking.checked_in
            });

          if (guestError) throw guestError;
        }

        // Create waivers if tour requires them
        if (tour.requires_waiver) {
          const { data: waiverTemplate } = await supabase
            .from('waiver_templates')
            .select('id')
            .eq('is_active', true)
            .limit(1)
            .single();

          if (waiverTemplate) {
            for (let g = 0; g < guestCount; g++) {
              const waiverStatus = getRandomItem(['pending', 'signed'] as const);

              await supabase
                .from('waivers')
                .insert({
                  booking_id: booking.id,
                  guest_id: g,
                  waiver_template_id: waiverTemplate.id,
                  status: waiverStatus,
                  signed_at: waiverStatus === 'signed' ? new Date().toISOString() : null,
                  signature_url: waiverStatus === 'signed' ? 'https://example.com/signature.png' : null
                });
            }
          }
        }
      }
    }

    // 4. Print summary
    console.log('\n✅ Test data generation complete!\n');
    console.log('📊 Summary:');
    console.log(`   Tours: ${tours?.length || 0}`);
    console.log(`   Availabilities: ${availabilityCount}`);
    console.log(`   Bookings created: ${bookings.length}`);
    console.log(`   Date range: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);
    console.log(`\n👥 Staff assigned:`);
    guides.forEach(g => console.log(`   - ${g.name} (${g.role})`));

    console.log('\n🎯 You can now test the system with this data!');

  } catch (error) {
    console.error('❌ Error generating test data:', error);
    process.exit(1);
  }
}

generateTestData();
