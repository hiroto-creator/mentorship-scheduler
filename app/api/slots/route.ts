export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import type { CreateSlotInput } from "@/types";

// POST /api/slots — add a slot to an event
export async function POST(req: NextRequest) {
  const body: CreateSlotInput | CreateSlotInput[] = await req.json();
  const db = createServerClient();

  const slots = Array.isArray(body) ? body : [body];

  const rows = slots.map((s) => ({
    id: uuidv4(),
    event_id: s.event_id,
    date: s.date,
    start_time: s.start_time,
    end_time: s.end_time,
    is_available: true,
  }));

  const { data, error } = await db.from("slots").insert(rows).select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}

// DELETE /api/slots?id=xxx
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = createServerClient();
  const { error } = await db.from("slots").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
