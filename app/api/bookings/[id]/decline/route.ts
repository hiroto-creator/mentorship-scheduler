export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { sendDeclineNotification } from "@/lib/email";

const HTML = (title: string, body: string) => `
<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8">
<style>body{font-family:'Hiragino Kaku Gothic ProN',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#EBEBEB;margin:0;}
.box{background:#f5f5f5;border-radius:14px;padding:40px 48px;text-align:center;max-width:420px;border:1px solid #d4d4d4;}
h2{color:#1a1a1a;margin:0 0 10px;font-size:20px;font-weight:500;}p{color:#888;font-size:14px;margin:0;line-height:1.6;}
</style></head><body><div class="box"><h2>${title}</h2><p>${body}</p></div></body></html>`;

async function handleDecline(bookingId: string) {
  const db = createServerClient();

  const { data: booking, error } = await db
    .from("bookings")
    .select("*, slots(*), events(*)")
    .eq("id", bookingId)
    .single();

  if (error || !booking) {
    return new Response(HTML("エラー", "予約が見つかりません。"), { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
  if (booking.status === "cancelled") {
    return new Response(HTML("処理済み", "この予約はすでにキャンセル済みです。"), { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  // Mark as cancelled and restore slot availability
  await db.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
  await db.from("slots").update({ is_available: true }).eq("id", booking.slot_id);

  // Notify guest
  try {
    await sendDeclineNotification(booking.events, booking.slots, booking);
  } catch (e) {
    console.error("Decline email failed:", e);
  }

  return new Response(
    HTML("予約をお断りしました", `${booking.guest_name}様にお断りのメールを送信しました。`),
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  return handleDecline(params.id);
}
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  return handleDecline(params.id);
}
