import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { OWNERS, PLAYERS } from "@/lib/seed-data";

export async function POST() {
  try {
    // Insert owners
    const { data: insertedOwners, error: ownersError } = await supabaseAdmin
      .from("owners")
      .upsert(
        OWNERS.map((o) => ({ name: o.name })),
        { onConflict: "name" }
      )
      .select("id, name");

    if (ownersError) {
      return NextResponse.json(
        { error: "Failed to seed owners", detail: ownersError },
        { status: 500 }
      );
    }

    const ownerMap = new Map(
      (insertedOwners ?? []).map((o) => [o.name, o.id])
    );

    // Insert players
    const playerRows = PLAYERS.map((p) => ({
      name: p.name,
      ipl_team: p.ipl_team,
      owner_id: ownerMap.get(p.owner)!,
      purse_spent: p.purse_spent,
      is_captain: p.is_captain,
      is_vice_captain: p.is_vice_captain,
    }));

    const { error: playersError } = await supabaseAdmin
      .from("players")
      .upsert(playerRows, { onConflict: "id" });

    if (playersError) {
      return NextResponse.json(
        { error: "Failed to seed players", detail: playersError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "success",
      owners: insertedOwners?.length,
      players: playerRows.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
