import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

function checkAuth(request: Request): boolean {
  return request.headers.get("x-admin-password") === process.env.ADMIN_PASSWORD;
}

export async function GET(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: players, error } = await supabaseAdmin
    .from("players")
    .select("*, owners(name)")
    .order("owner_id")
    .order("purse_spent", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(players);
}

export async function POST(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { data, error } = await supabaseAdmin
      .from("players")
      .insert({
        name: body.name,
        ipl_team: body.ipl_team || null,
        owner_id: body.owner_id,
        purse_spent: body.purse_spent || 0,
        is_captain: false,
        is_vice_captain: false,
        cricapi_player_id: body.cricapi_player_id || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, ...updates } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Player id required" }, { status: 400 });
    }

    // If setting captain, clear existing captain for that owner
    if (updates.is_captain === true) {
      const { data: player } = await supabaseAdmin
        .from("players")
        .select("owner_id")
        .eq("id", id)
        .single();

      if (player) {
        await supabaseAdmin
          .from("players")
          .update({ is_captain: false })
          .eq("owner_id", player.owner_id)
          .eq("is_captain", true);

        // Can't be both C and VC
        updates.is_vice_captain = false;
      }
    }

    // If setting vice captain, clear existing VC for that owner
    if (updates.is_vice_captain === true) {
      const { data: player } = await supabaseAdmin
        .from("players")
        .select("owner_id")
        .eq("id", id)
        .single();

      if (player) {
        await supabaseAdmin
          .from("players")
          .update({ is_vice_captain: false })
          .eq("owner_id", player.owner_id)
          .eq("is_vice_captain", true);

        // Can't be both C and VC
        updates.is_captain = false;
      }
    }

    const { data, error } = await supabaseAdmin
      .from("players")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await request.json();
    const { error } = await supabaseAdmin.from("players").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
