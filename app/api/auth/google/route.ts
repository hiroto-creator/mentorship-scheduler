export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUrl, getTokensFromCode } from "@/lib/google";

// GET /api/auth/google — redirect to Google OAuth
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    // Step 1: redirect to Google
    const url = getAuthUrl();
    return NextResponse.redirect(url);
  }

  // Step 2: exchange code for tokens
  const tokens = await getTokensFromCode(code);
  if (!tokens) {
    return NextResponse.json({ error: "Token exchange failed" }, { status: 500 });
  }

  // Show tokens to set in .env.local (only for initial setup)
  return NextResponse.json({
    message: "以下のトークンを .env.local の GOOGLE_REFRESH_TOKEN に設定してください",
    refresh_token: tokens.refresh_token,
    access_token: tokens.access_token,
  });
}
