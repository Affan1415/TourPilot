import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Check if user already has a customer record linked
    const { data: existingLinked } = await adminClient
      .from("customers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existingLinked) {
      return NextResponse.json({
        linked: true,
        customer_id: existingLinked.id,
        message: "Customer already linked"
      });
    }

    // Try to find and link an existing customer by email
    const { data: existingCustomer } = await adminClient
      .from("customers")
      .select("id")
      .eq("email", user.email)
      .is("user_id", null)
      .single();

    if (existingCustomer) {
      // Link the existing customer to this user
      const { error: updateError } = await adminClient
        .from("customers")
        .update({ user_id: user.id })
        .eq("id", existingCustomer.id);

      if (updateError) {
        console.error("Failed to link customer:", updateError);
        return NextResponse.json({ error: "Failed to link customer" }, { status: 500 });
      }

      return NextResponse.json({
        linked: true,
        customer_id: existingCustomer.id,
        message: "Customer linked successfully"
      });
    }

    // No existing customer found, create a new one
    const { data: newCustomer, error: createError } = await adminClient
      .from("customers")
      .insert({
        user_id: user.id,
        email: user.email,
        first_name: user.user_metadata?.full_name?.split(" ")[0] || "Guest",
        last_name: user.user_metadata?.full_name?.split(" ").slice(1).join(" ") || "User",
        phone: "",
      })
      .select("id")
      .single();

    if (createError) {
      console.error("Failed to create customer:", createError);
      return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
    }

    return NextResponse.json({
      linked: true,
      customer_id: newCustomer.id,
      message: "Customer created successfully"
    });
  } catch (error) {
    console.error("Customer link error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
