import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createAffiliate() {
  const affiliateEmail = "affanzahir24@gmail.com";
  const affiliatePassword = "123456";
  const managerEmail = "affanzahir27@gmail.com";

  console.log("Creating affiliate account...");

  // 1. Find the location manager's location
  const { data: manager, error: managerError } = await supabase
    .from("staff")
    .select("id, name, location_id, role")
    .eq("email", managerEmail)
    .single();

  if (managerError || !manager) {
    console.error("Manager not found:", managerError);
    return;
  }

  console.log("Found manager:", manager.name, "Location ID:", manager.location_id);

  if (!manager.location_id) {
    console.error("Manager has no location assigned");
    return;
  }

  // Get location details
  const { data: location } = await supabase
    .from("locations")
    .select("id, name, slug")
    .eq("id", manager.location_id)
    .single();

  console.log("Location:", location?.name);

  // 2. Create auth user for affiliate
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: affiliateEmail,
    password: affiliatePassword,
    email_confirm: true,
  });

  if (authError) {
    // User might already exist, try to get them
    if (authError.message.includes("already") || authError.message.includes("exists")) {
      console.log("Auth user already exists, looking up...");
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers.users.find((u) => u.email === affiliateEmail);
      if (existingUser) {
        console.log("Found existing auth user:", existingUser.id);
        // Continue with existing user
        await createStaffAndProfile(existingUser.id, affiliateEmail, manager.location_id, location?.slug || "loc");
        return;
      }
    }
    console.error("Auth error:", authError);
    return;
  }

  console.log("Created auth user:", authUser.user.id);

  // 3. Create staff record and affiliate profile
  await createStaffAndProfile(authUser.user.id, affiliateEmail, manager.location_id, location?.slug || "loc");
}

async function createStaffAndProfile(userId: string, email: string, locationId: string, locationSlug: string) {
  // Check if staff already exists
  const { data: existingStaff } = await supabase
    .from("staff")
    .select("id, role")
    .eq("email", email)
    .single();

  let staffId: string;

  if (existingStaff) {
    console.log("Staff record exists, updating role to affiliate...");
    await supabase
      .from("staff")
      .update({ role: "affiliate", location_id: locationId })
      .eq("id", existingStaff.id);
    staffId = existingStaff.id;
  } else {
    // Create staff record
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .insert({
        user_id: userId,
        name: "Affan Zahir (Affiliate)",
        email: email,
        role: "affiliate",
        is_active: true,
        location_id: locationId,
      })
      .select()
      .single();

    if (staffError) {
      console.error("Staff creation error:", staffError);
      return;
    }
    staffId = staff.id;
    console.log("Created staff record:", staffId);
  }

  // Check if affiliate profile already exists
  const { data: existingProfile } = await supabase
    .from("affiliate_profiles")
    .select("id, affiliate_code")
    .eq("staff_id", staffId)
    .single();

  if (existingProfile) {
    console.log("Affiliate profile already exists!");
    console.log("Affiliate code:", existingProfile.affiliate_code);
    return;
  }

  // Generate affiliate code
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  const affiliateCode = `${locationSlug.substring(0, 4).toUpperCase()}-AZ${randomPart}`;

  // Create affiliate profile
  const { data: profile, error: profileError } = await supabase
    .from("affiliate_profiles")
    .insert({
      staff_id: staffId,
      location_id: locationId,
      affiliate_code: affiliateCode,
      commission_type: "percentage",
      commission_rate: 10,
      discount_type: "percentage",
      discount_value: 5,
      is_active: true,
    })
    .select()
    .single();

  if (profileError) {
    console.error("Profile creation error:", profileError);
    return;
  }

  console.log("\n✅ Affiliate created successfully!");
  console.log("================================");
  console.log("Email:", email);
  console.log("Password:", "123456");
  console.log("Affiliate Code:", affiliateCode);
  console.log("Commission: 10%");
  console.log("Customer Discount: 5%");
  console.log("================================");
}

createAffiliate().catch(console.error);
