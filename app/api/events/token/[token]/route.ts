export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

// GET /api/events/token/[token] — public guest access
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const db = createServerClient();
  const { data: event, error } = await db
    .from("events")
    .select(`*, slots(*)`)
    .eq("share_token", params.token)
    .eq("status", "active")
    .single();

  if (error || !event) {
    return NextResponse.json({ error: "イベントが見つかりません" }, { status: 404 });
  }

  // Filter: only available slots, sorted by date then time
  event.slots = (event.slots || [])
    .filter((s: { is_available: boolean }) => s.is_available)
    .sort((a: { date: string; start_time: string }, b: { date: string; start_time: string }) =>
      `${a.date}${a.start_time}`.localeCompare(`${b.date}${b.start_time}`)
    );

  return NextResponse.json({ data: event });
}
