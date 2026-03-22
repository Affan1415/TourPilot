import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireManager, forbiddenResponse } from "@/lib/auth/api-auth";
import { z } from "zod";

const updateCertificationSchema = z.object({
  name: z.string().min(1).optional(),
  issuing_authority: z.string().optional().nullable(),
  certification_number: z.string().optional().nullable(),
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  document_url: z.string().url().optional().nullable(),
  status: z.enum(["active", "expired", "revoked", "pending_renewal"]).optional(),
  notes: z.string().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireManager();
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("staff_certifications")
      .select(`
        *,
        staff:staff(id, name, email, role, location_id)
      `)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Certification not found" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Check location access
    if (auth.role !== "admin" && data.staff?.location_id !== auth.locationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    if (error.message?.includes("Unauthorized") || error.message?.includes("permission") || error.message?.includes("Forbidden")) {
      return forbiddenResponse(error.message);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireManager();
    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();

    const validation = updateCertificationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Get current certification to check access
    const { data: existing, error: fetchError } = await supabase
      .from("staff_certifications")
      .select("*, staff:staff(location_id)")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Certification not found" }, { status: 404 });
    }

    // Check location access
    if (auth.role !== "admin" && existing.staff?.location_id !== auth.locationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const updateData: Record<string, any> = {};
    const allowedFields = ["name", "issuing_authority", "certification_number", "issue_date", "expiry_date", "document_url", "status", "notes"];

    for (const field of allowedFields) {
      if (validation.data[field as keyof typeof validation.data] !== undefined) {
        updateData[field] = validation.data[field as keyof typeof validation.data];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("staff_certifications")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        staff:staff(id, name, email)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    if (error.message?.includes("Unauthorized") || error.message?.includes("permission") || error.message?.includes("Forbidden")) {
      return forbiddenResponse(error.message);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireManager();
    const { id } = await params;
    const supabase = await createClient();

    // Get certification to check access
    const { data: existing, error: fetchError } = await supabase
      .from("staff_certifications")
      .select("*, staff:staff(location_id)")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Certification not found" }, { status: 404 });
    }

    // Check location access
    if (auth.role !== "admin" && existing.staff?.location_id !== auth.locationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { error } = await supabase
      .from("staff_certifications")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Certification deleted" });
  } catch (error: any) {
    if (error.message?.includes("Unauthorized") || error.message?.includes("permission") || error.message?.includes("Forbidden")) {
      return forbiddenResponse(error.message);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
