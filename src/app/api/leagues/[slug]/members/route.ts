import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

// GET /api/leagues/[slug]/members — list members of a league
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Find league
  const { data: league, error: leagueError } = await supabaseAdmin
    .from("leagues")
    .select("id")
    .eq("slug", slug)
    .single();

  if (leagueError || !league) {
    return NextResponse.json({ error: "League not found" }, { status: 404 });
  }

  const { data: members, error } = await supabaseAdmin
    .from("league_members")
    .select("id, display_name, role, joined_at, user_id")
    .eq("league_id", league.id)
    .order("joined_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(members ?? []);
}
