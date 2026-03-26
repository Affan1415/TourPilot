import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { locales, Locale } from "@/lib/i18n";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ language: "en" });
    }

    // Try to get language from staff table first
    const { data: staff } = await supabase
      .from("staff")
      .select("language")
      .eq("user_id", user.id)
      .single();

    if (staff?.language) {
      return NextResponse.json({ language: staff.language });
    }

    // Try customers table
    const { data: customer } = await supabase
      .from("customers")
      .select("language")
      .eq("user_id", user.id)
      .single();

    if (customer?.language) {
      return NextResponse.json({ language: customer.language });
    }

    return NextResponse.json({ language: "en" });
  } catch {
    return NextResponse.json({ language: "en" });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { language } = body;

    // Validate language
    if (!language || !locales.includes(language as Locale)) {
      return NextResponse.json(
        { error: "Invalid language. Supported: en, nl, es, de, fr" },
        { status: 400 }
      );
    }

    // Try to update staff record first
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .update({ language })
      .eq("user_id", user.id)
      .select()
      .single();

    if (!staffError && staff) {
      return NextResponse.json({ success: true, language });
    }

    // Try customer record
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .update({ language })
      .eq("user_id", user.id)
      .select()
      .single();

    if (!customerError && customer) {
      return NextResponse.json({ success: true, language });
    }

    // Neither staff nor customer found
    return NextResponse.json(
      { error: "User profile not found" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Error updating language preference:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
