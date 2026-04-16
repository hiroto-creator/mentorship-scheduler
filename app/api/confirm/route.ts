export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

// /api/confirm は後方互換エンドポイント — /api/bookings/[id]/confirm にリダイレクト
export async function POST(req: NextRequest) {
  const { booking_id, confirmed_slots } = await req.json();
  if (!booking_id) return NextResponse.json({ error: "booking_id is required" }, { status: 400 });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/bookings/${booking_id}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirmed_slots }),
  });
  const json = await res.json();
  return NextResponse.json(json, { status: res.status });
}
