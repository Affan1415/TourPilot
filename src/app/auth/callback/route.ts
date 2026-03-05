import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const loginType = requestUrl.searchParams.get("type") as "admin" | "captain" | "customer" | null;

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // If login type was specified, validate and redirect accordingly
      if (loginType) {
        if (loginType === "admin") {
          // Verify user is staff with appropriate role
          const { data: staffData } = await supabase
            .from('staff')
            .select('role, is_active')
            .eq('user_id', data.user.id)
            .single();

          if (staffData && staffData.is_active && ['admin', 'manager', 'guide', 'front_desk'].includes(staffData.role)) {
            return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
          } else {
            // Sign out and redirect with error
            await supabase.auth.signOut();
            return NextResponse.redirect(new URL("/login?error=no_admin_access", requestUrl.origin));
          }
        } else if (loginType === "captain") {
          // Verify user is captain
          const { data: staffData } = await supabase
            .from('staff')
            .select('role, is_active')
            .eq('user_id', data.user.id)
            .single();

          if (staffData && staffData.is_active && staffData.role === 'captain') {
            return NextResponse.redirect(new URL("/captain", requestUrl.origin));
          } else {
            await supabase.auth.signOut();
            return NextResponse.redirect(new URL("/login?error=no_captain_access", requestUrl.origin));
          }
        } else if (loginType === "customer") {
          // Handle customer login - create or link customer record using admin client (bypasses RLS)
          const adminClient = createAdminClient();

          const { data: customerData } = await adminClient
            .from('customers')
            .select('id')
            .eq('user_id', data.user.id)
            .single();

          if (customerData) {
            return NextResponse.redirect(new URL("/account", requestUrl.origin));
          }

          // Try to link existing customer by email
          const { data: existingCustomer } = await adminClient
            .from('customers')
            .select('id')
            .eq('email', data.user.email)
            .is('user_id', null)
            .single();

          if (existingCustomer) {
            await adminClient
              .from('customers')
              .update({ user_id: data.user.id })
              .eq('id', existingCustomer.id);
            return NextResponse.redirect(new URL("/account", requestUrl.origin));
          }

          // Create new customer record
          await adminClient
            .from('customers')
            .insert({
              user_id: data.user.id,
              email: data.user.email,
              first_name: data.user.user_metadata?.full_name?.split(' ')[0] || 'Guest',
              last_name: data.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || 'User',
              phone: '',
            });

          return NextResponse.redirect(new URL("/account", requestUrl.origin));
        }
      }

      // Fallback: auto-detect role if no type specified
      let redirectPath = "/";

      const { data: staffData } = await supabase
        .from('staff')
        .select('role, is_active')
        .eq('user_id', data.user.id)
        .single();

      if (staffData && staffData.is_active) {
        if (staffData.role === 'captain') {
          redirectPath = "/captain";
        } else {
          redirectPath = "/dashboard";
        }
      } else {
        const { data: customerData } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', data.user.id)
          .single();

        if (customerData) {
          redirectPath = "/account";
        }
      }

      return NextResponse.redirect(new URL(redirectPath, requestUrl.origin));
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(new URL("/login?error=auth", requestUrl.origin));
}
