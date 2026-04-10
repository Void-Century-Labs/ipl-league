import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { createClient } from "@/lib/supabase-ssr";

// POST /api/leagues/[slug]/join — join a league by invite code
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { invite_code, display_name } = body;

  // Find league
  const { data: league, error: leagueError } = await supabaseAdmin
    .from("leagues")
    .select("id, invite_code, max_owners")
    .eq("slug", slug)
    .single();

  if (leagueError || !league) {
    return NextResponse.json({ error: "League not found" }, { status: 404 });
  }

  // Verify invite code
  if (league.invite_code !== invite_code) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 403 });
  }

  // Check member count
  const { count } = await supabaseAdmin
    .from("league_members")
    .select("id", { count: "exact", head: true })
    .eq("league_id", league.id);

  if (count !== null && count >= league.max_owners) {
    return NextResponse.json({ error: "League is full" }, { status: 400 });
  }

  // Check if already a member
  const { data: existing } = await supabaseAdmin
    .from("league_members")
    .select("id")
    .eq("league_id", league.id)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    return NextResponse.json({ error: "Already a member" }, { status: 400 });
  }

  // Join
  const name =
    display_name ||
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "Owner";

  const { data: member, error: memberError } = await supabaseAdmin
    .from("league_members")
    .insert({
      league_id: league.id,
      user_id: user.id,
      display_name: name,
      role: "member",
    })
    .select()
    .single();

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  return NextResponse.json(member, { status: 201 });
}
