import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-ssr";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirect = searchParams.get("redirect") || "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${redirect}`);
    }
  }

  // If there's no code or an error, redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
