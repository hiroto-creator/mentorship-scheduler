export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { sendConfirmationToGuest, sendConfirmationToHost } from "@/lib/email";

interface ConfirmedSlot {
  slot_id: string;
  date: string;
  start_time: string;
  end_time: string;
  assignee_name?: string | null;
  assignee_email?: string | null;
}

interface ResultSlot {
  slot_id: string;
  date: string;
  start_time: string;
  end_time: string;
  assignee_name?: string | null;
  assignee_email?: string | null;
  google_event_id: null;
  meet_link: null;
}

type HandleResult =
  | { html: true; title: string; body: string; status: number; data: null }
  | { html: false; data: object; results: ResultSlot[]; total: number; message: string };

const HTML = (title: string, body: string) => `
<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8">
<style>
  body { font-family: 'Hiragino Kaku Gothic ProN', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #EBEBEB; margin: 0; }
  .box { background: #f5f5f5; border-radius: 14px; padding: 40px 48px; text-align: center; max-width: 440px; border: 1px solid #d4d4d4; }
  h2 { color: #1a1a1a; margin: 0 0 10px; font-size: 20px; font-weight: 500; }
  p { color: #888; font-size: 14px; margin: 0; line-height: 1.6; }
</style></head>
<body><div class="box"><h2>${title}</h2><p>${body}</p></div></body></html>`;

async function handleConfirm(
  bookingId: string,
  confirmedSlots?: ConfirmedSlot[],
  slotIndex?: number   // Phase 2: メールの個別ボタン用インデックス
): Promise<HandleResult> {
  const db = createServerClient();

  const { data: booking, error } = await db
    .from("bookings")
    .select("*, slots(*), events(*)")
    .eq("id", bookingId)
    .single();

  if (error || !booking) {
    return { html: true, title: "エラー", body: "予約が見つかりません。", status: 404, data: null };
  }
  if (booking.status === "confirmed") {
    return { html: true, title: "確定済み", body: "この予約はすでに確定済みです。", status: 200, data: null };
  }

  const event = booking.events;
  const baseSlot = booking.slots;

  // 確定するスロットリストを決定（優先順位）:
  // 1. POSTボディの confirmed_slots
  // 2. GETクエリの slot_index → candidate_slots[i] を1件だけ確定
  // 3. fallback: 単一スロット（後方互換）
  let slotsToConfirm: ConfirmedSlot[];

  if (confirmedSlots?.length) {
    slotsToConfirm = confirmedSlots;
  } else if (slotIndex !== undefined) {
    // Phase 2: メール個別ボタン — candidate_slots[slotIndex] を確定
    // candidate_slots はゲスト送信時の camelCase 形式
    const candidates: any[] = (booking.candidate_slots as any[]) || [];
    const target = candidates[slotIndex];
    if (!target) {
      return { html: true, title: "エラー", body: `候補日時 #${slotIndex + 1} が見つかりません。`, status: 404, data: null };
    }
    slotsToConfirm = [{
      slot_id: target.slotId ?? target.slot_id ?? baseSlot.id,
      date: target.date,
      start_time: (target.startTime ?? target.start_time ?? baseSlot.start_time) as string,
      end_time: (target.endTime ?? target.end_time ?? baseSlot.end_time) as string,
      assignee_name: baseSlot.assignee_name,
      assignee_email: baseSlot.assignee_email,
    }];
  } else {
    slotsToConfirm = [{
      slot_id: baseSlot.id,
      date: baseSlot.date,
      start_time: booking.chosen_start_time || baseSlot.start_time,
      end_time: booking.chosen_end_time || baseSlot.end_time,
      assignee_name: baseSlot.assignee_name,
      assignee_email: baseSlot.assignee_email,
    }];
  }

  // Google API なし — 結果を組み立てるだけ
  const results: ResultSlot[] = slotsToConfirm.map(s => ({
    slot_id: s.slot_id,
    date: s.date,
    start_time: s.start_time.length === 5 ? s.start_time + ":00" : s.start_time,
    end_time: s.end_time.length === 5 ? s.end_time + ":00" : s.end_time,
    assignee_name: s.assignee_name ?? baseSlot.assignee_name,
    assignee_email: s.assignee_email ?? baseSlot.assignee_email,
    google_event_id: null,
    meet_link: null,
  }));

  // 1. DBを確定済みに更新
  const { error: updateError } = await db.from("bookings").update({
    status: "confirmed",
    confirmed_slots: results,
    google_event_id: null,
    meet_link: null,
    confirmed_at: new Date().toISOString(),
  }).eq("id", bookingId);

  if (updateError) {
    console.error("[confirm] DB update error:", updateError);
    return { html: true, title: "エラー", body: "予約の確定に失敗しました。", status: 500, data: null };
  }

  // 2. 確定メール（ゲスト・管理者を個別に送信）
  const guestOk = await sendConfirmationToGuest(event, baseSlot, booking, results)
    .catch(e => { console.error("[confirm] guest email error:", e); return false; });

  const hostOk = await sendConfirmationToHost(event, baseSlot, booking, results)
    .catch(e => { console.error("[confirm] host email error:", e); return false; });

  console.log(`[confirm] id=${bookingId} slots=${results.length} guest=${guestOk} host=${hostOk}`);

  return {
    html: false,
    data: { status: "confirmed", confirmed_slots: results },
    results,
    total: results.length,
    message: `${results.length}件の予約を確定しました`,
  };
}

// GET — メールボタン（個別確定ボタン対応）
// 例: /api/bookings/[id]/confirm?slot_index=2
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const slotIndexStr = req.nextUrl.searchParams.get("slot_index");
  const slotIndex = slotIndexStr !== null ? parseInt(slotIndexStr, 10) : undefined;

  const result = await handleConfirm(params.id, undefined, slotIndex);
  if (result.html) {
    return new Response(HTML(result.title, result.body), {
      status: result.status,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // 確定した日程をHTMLで表示
  const confirmedDate = result.results[0]
    ? `${result.results[0].date} ${result.results[0].start_time.substring(0,5)}〜${result.results[0].end_time.substring(0,5)}`
    : "";

  return new Response(
    HTML(
      "✅ 予約を確定しました",
      `${result.total}件の確定処理が完了しました。<br>ゲストへ確定メールを送信しました。${confirmedDate ? `<br><small style="color:#bbb;">${confirmedDate}</small>` : ""}`
    ),
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

// POST — 管理画面から（複数スロット選択）
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const result = await handleConfirm(params.id, body.confirmed_slots);
  if (result.html) {
    return Response.json({ error: result.body }, { status: result.status });
  }
  return Response.json({
    data: result.data,
    results: result.results,
    message: result.message,
  });
}
