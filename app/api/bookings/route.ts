export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import { sendBookingRequestToHost } from "@/lib/email";

export async function GET(req: NextRequest) {
  const event_id = req.nextUrl.searchParams.get("event_id");
  const db = createServerClient();
  let query = db.from("bookings").select("*, slots(*), events(*)").order("created_at", { ascending: false });
  if (event_id) query = query.eq("event_id", event_id);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.slot_id || !body.guest_name || !body.guest_email) {
    return NextResponse.json({ error: "slot_id, guest_name, guest_email は必須です" }, { status: 400 });
  }

  const db = createServerClient();

  // スロット + イベント + assignee情報を取得
  const { data: slot, error: slotErr } = await db
    .from("slots").select("*, events(*)").eq("id", body.slot_id).single();

  if (slotErr || !slot) {
    return NextResponse.json({ error: "この日程は存在しません" }, { status: 409 });
  }

  const startTime = body.chosen_start_time
    ? (body.chosen_start_time.length === 5 ? body.chosen_start_time + ":00" : body.chosen_start_time)
    : slot.start_time;
  const endTime = body.chosen_end_time
    ? (body.chosen_end_time.length === 5 ? body.chosen_end_time + ":00" : body.chosen_end_time)
    : slot.end_time;

  const { data: booking, error: bookingErr } = await db.from("bookings").insert({
    id: uuidv4(),
    event_id: slot.event_id,
    slot_id: body.slot_id,
    guest_name: body.guest_name,
    guest_email: body.guest_email,
    chosen_start_time: startTime,
    chosen_end_time: endTime,
    // Phase 2: candidate_slots を保存（複数候補全て）
    candidate_slots: body.candidate_slots ?? null,
    notes: body.notes ?? null,
    status: "pending",
  }).select().single();

  if (bookingErr) return NextResponse.json({ error: bookingErr.message }, { status: 500 });

  // Phase 3: 通知メールの宛先 = マスター + スロットのフィードバック担当者
  const event = slot.events;
  const MASTER = "hiroto@kuppography.com";
  const assigneeEmail = slot.assignee_email as string | null;

  try {
    await sendBookingRequestToHost(
      event, slot, booking, startTime, endTime,
      MASTER, assigneeEmail
    );
  } catch (e) {
    console.error("[bookings/POST] notification email failed:", e);
  }

  return NextResponse.json({ data: booking }, { status: 201 });
}
