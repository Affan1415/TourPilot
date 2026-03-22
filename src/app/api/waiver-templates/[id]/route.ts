import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, forbiddenResponse } from "@/lib/auth/api-auth";

// GET: Get a single waiver template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("waiver_templates")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Waiver template not found" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT: Update a waiver template (creates new version)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin permission
    try {
      await requireAdmin();
    } catch (e: any) {
      return forbiddenResponse(e.message);
    }

    const { id } = await params;
    const adminClient = createAdminClient();
    const body = await request.json();

    // Get current template
    const { data: current, error: fetchError } = await adminClient
      .from("waiver_templates")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !current) {
      return NextResponse.json({ error: "Waiver template not found" }, { status: 404 });
    }

    const updateData: Record<string, any> = {};

    if (body.name !== undefined) {
      updateData.name = body.name;
    }

    if (body.is_active !== undefined) {
      updateData.is_active = body.is_active;
    }

    // If content is changed, increment version
    if (body.content !== undefined && body.content !== current.content) {
      updateData.content = body.content;
      updateData.version = current.version + 1;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No changes to apply" },
        { status: 400 }
      );
    }

    const { data, error } = await adminClient
      .from("waiver_templates")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Deactivate a waiver template (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin permission
    try {
      await requireAdmin();
    } catch (e: any) {
      return forbiddenResponse(e.message);
    }

    const { id } = await params;
    const adminClient = createAdminClient();

    // Check if template is used by any tour
    const { data: tourWaivers } = await adminClient
      .from("tour_waivers")
      .select("id")
      .eq("waiver_template_id", id)
      .limit(1);

    if (tourWaivers && tourWaivers.length > 0) {
      // Soft delete - just deactivate
      const { data, error } = await adminClient
        .from("waiver_templates")
        .update({ is_active: false })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        data,
        message: "Waiver template deactivated (in use by tours)",
      });
    }

    // Check for signed waivers
    const { data: signedWaivers } = await adminClient
      .from("waivers")
      .select("id")
      .eq("waiver_template_id", id)
      .limit(1);

    if (signedWaivers && signedWaivers.length > 0) {
      // Soft delete - just deactivate
      const { data, error } = await adminClient
        .from("waiver_templates")
        .update({ is_active: false })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        data,
        message: "Waiver template deactivated (has signed waivers)",
      });
    }

    // Hard delete if not used
    const { error } = await adminClient
      .from("waiver_templates")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Waiver template deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
