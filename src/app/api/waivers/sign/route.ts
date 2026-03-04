import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const adminClient = createAdminClient();
    const body = await request.json();

    const { waiver_id, signature_data, ip_address } = body;

    // Upload signature to storage
    const signatureBuffer = Buffer.from(
      signature_data.replace(/^data:image\/\w+;base64,/, ""),
      "base64"
    );

    const fileName = `signatures/${waiver_id}_${Date.now()}.png`;

    const { error: uploadError } = await adminClient.storage
      .from("waivers")
      .upload(fileName, signatureBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = adminClient.storage
      .from("waivers")
      .getPublicUrl(fileName);

    // Update waiver record
    const { data, error } = await adminClient
      .from("waivers")
      .update({
        signature_url: urlData.publicUrl,
        signed_at: new Date().toISOString(),
        ip_address,
        status: "signed",
      })
      .eq("id", waiver_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Waiver signing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
