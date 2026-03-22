import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireManager, forbiddenResponse } from "@/lib/auth/api-auth";
import { z } from "zod";

const createCertificationSchema = z.object({
  staff_id: z.string().uuid(),
  name: z.string().min(1, "Certification name is required"),
  issuing_authority: z.string().optional(),
  certification_number: z.string().optional(),
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  document_url: z.string().url().optional().nullable(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await requireManager();
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    const staffId = searchParams.get("staff_id");
    const status = searchParams.get("status");
    const expiringSoon = searchParams.get("expiring_soon");

    let query = supabase
      .from("staff_certifications")
      .select(`
        *,
        staff:staff(id, name, email, role)
      `)
      .order("expiry_date", { ascending: true, nullsFirst: false });

    // Non-admin users can only see their location's staff certifications
    if (auth.role !== "admin" && auth.locationId) {
      query = query.eq("staff.location_id", auth.locationId);
    }

    if (staffId) {
      query = query.eq("staff_id", staffId);
    }

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter for expiring soon if requested
    let filteredData = data;
    if (expiringSoon === "true") {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const now = new Date();

      filteredData = data?.filter((cert: any) => {
        if (!cert.expiry_date) return false;
        const expiryDate = new Date(cert.expiry_date);
        return expiryDate >= now && expiryDate <= thirtyDaysFromNow;
      });
    }

    return NextResponse.json({ data: filteredData });
  } catch (error: any) {
    if (error.message?.includes("Unauthorized") || error.message?.includes("permission") || error.message?.includes("Forbidden")) {
      return forbiddenResponse(error.message);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireManager();
    const supabase = await createClient();
    const body = await request.json();

    const validation = createCertificationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { staff_id, name, issuing_authority, certification_number, issue_date, expiry_date, document_url, notes } = validation.data;

    // Verify staff exists and user has access
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("id, location_id")
      .eq("id", staff_id)
      .single();

    if (staffError || !staff) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    // Non-admin users can only manage their location's staff
    if (auth.role !== "admin" && staff.location_id !== auth.locationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("staff_certifications")
      .insert([{
        staff_id,
        name,
        issuing_authority: issuing_authority || null,
        certification_number: certification_number || null,
        issue_date,
        expiry_date: expiry_date || null,
        document_url: document_url || null,
        notes: notes || null,
        status: "active",
      }])
      .select(`
        *,
        staff:staff(id, name, email)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    if (error.message?.includes("Unauthorized") || error.message?.includes("permission") || error.message?.includes("Forbidden")) {
      return forbiddenResponse(error.message);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
