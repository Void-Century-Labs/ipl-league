import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { createClient } from "@/lib/supabase-ssr";

// GET /api/leagues — list leagues for current user (or all public leagues)
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Get leagues the user is a member of
    const { data, error } = await supabaseAdmin
      .from("league_members")
      .select("league_id, display_name, role, leagues(*, seasons(*))")
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data ?? []);
  }

  // Unauthenticated: return all leagues (public info only)
  const { data, error } = await supabaseAdmin
    .from("leagues")
    .select("id, name, slug, created_at, seasons(name)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

// POST /api/leagues — create a new league
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, season_id, max_owners, purse_budget } = body;

  if (!name) {
    return NextResponse.json({ error: "League name required" }, { status: 400 });
  }

  // Generate slug from name
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  // Create league
  const { data: league, error: leagueError } = await supabaseAdmin
    .from("leagues")
    .insert({
      name,
      slug: `${slug}-${Date.now().toString(36)}`,
      season_id: season_id || null,
      created_by: user.id,
      max_owners: max_owners || 10,
      purse_budget: purse_budget || 20000,
    })
    .select()
    .single();

  if (leagueError) {
    return NextResponse.json({ error: leagueError.message }, { status: 500 });
  }

  // Auto-add creator as admin member
  const displayName =
    user.user_metadata?.display_name || user.email?.split("@")[0] || "Owner";

  await supabaseAdmin.from("league_members").insert({
    league_id: league.id,
    user_id: user.id,
    display_name: displayName,
    role: "admin",
  });

  return NextResponse.json(league, { status: 201 });
}
