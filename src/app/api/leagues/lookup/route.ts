import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

// GET /api/leagues/lookup?invite_code=xxx — find league by invite code
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const inviteCode = searchParams.get("invite_code");

  if (!inviteCode) {
    return NextResponse.json({ error: "invite_code required" }, { status: 400 });
  }

  const { data: league, error } = await supabaseAdmin
    .from("leagues")
    .select("slug, name")
    .eq("invite_code", inviteCode)
    .single();

  if (error || !league) {
    return NextResponse.json({ error: "League not found" }, { status: 404 });
  }

  return NextResponse.json(league);
}
