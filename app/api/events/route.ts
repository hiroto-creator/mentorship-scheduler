export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import type { CreateEventInput } from "@/types";

// GET /api/events — list all events (admin)
export async function GET() {
  const db = createServerClient();
  const { data, error } = await db
    .from("events")
    .select("*, slots(*)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// POST /api/events — create a new event
export async function POST(req: NextRequest) {
  const body: CreateEventInput = await req.json();

  if (!body.title || !body.host_name || !body.host_email) {
    return NextResponse.json({ error: "title, host_name, host_email は必須です" }, { status: 400 });
  }

  const db = createServerClient();
  const { data, error } = await db
    .from("events")
    .insert({
      id: uuidv4(),
      title: body.title,
      description: body.description ?? null,
      host_name: body.host_name,
      host_email: body.host_email,
      duration_minutes: body.duration_minutes ?? 60,
      location: body.location ?? null,
      content_name: body.content_name ?? null,
      status: "active",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
