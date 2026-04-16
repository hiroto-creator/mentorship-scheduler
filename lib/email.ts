import { Resend } from "resend";
import type { Event, Slot, Booking } from "@/types";
import { formatDate } from "./utils";

function getResend() { return new Resend(process.env.RESEND_API_KEY || "placeholder"); }
const FROM = process.env.EMAIL_FROM || "noreply@example.com";
const MASTER_EMAIL = "hiroto@kuppography.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const EMAIL_BG = "#EBEBEB";
const CARD_BG = "#f5f5f5";
const HEADER_BG = "#1a1a1a";

// ── Phase 2/3: 担当者ラベルの条件分岐 ────────────────────────
// イベントタイトルの表記ゆれに対応（スペースあり/なし両方）
function getAssigneeLabel(eventTitle: string): string | null {
  // 余分なスペースを正規化して比較
  const t = eventTitle.trim().split(/\s+/).join(" ");

  if (t === "1on1 フィードバック" || t === "1on1フィードバック") {
    return "フィードバック担当者";
  }
  if (t === "撮影見学" || t === "撮影体験") {
    return "撮影担当者";
  }
  // レビュー会・交流会 → null（担当者情報は一切記載しない）
  return null;
}

// ── 型定義 ──────────────────────────────────────────────────
interface CandidateSlot {
  slotId?: string;
  slot_id?: string;
  date: string;
  startTime?: string;
  start_time?: string;
  endTime?: string;
  end_time?: string;
}

export interface ConfirmedSlotResult {
  slot_id: string;
  date: string;
  start_time: string;
  end_time: string;
  assignee_name?: string | null;
  assignee_email?: string | null;
  google_event_id?: string | null;
  meet_link?: string | null;
}

// ── 予約リクエスト通知（マスター + フィードバック担当者宛）────
export async function sendBookingRequestToHost(
  event: Event,
  slot: Slot,
  booking: Booking,
  startTime: string,
  endTime: string,
  masterEmail: string,
  assigneeEmail?: string | null
): Promise<boolean> {
  const toSet = new Set([masterEmail]);
  if (assigneeEmail) toSet.add(assigneeEmail);
  const to = Array.from(toSet);

  const declineUrl = `${APP_URL}/api/bookings/${booking.id}/decline`;
  const assigneeName = (slot as any).assignee_name as string | null;

  const rawCandidates: CandidateSlot[] = (booking as any).candidate_slots || [];

  // 各候補に個別確定ボタン
  let slotsSection = "";
  if (rawCandidates.length > 0) {
    const slotsHtml = rawCandidates.map((c, i) => {
      const st = (c.startTime || c.start_time || "").substring(0, 5);
      const et = (c.endTime || c.end_time || "").substring(0, 5);
      const confirmUrl = `${APP_URL}/api/bookings/${booking.id}/confirm?slot_index=${i}`;
      return `
        <div style="background:${EMAIL_BG};border-radius:8px;padding:12px 16px;margin-bottom:10px;">
          <div style="font-size:14px;font-weight:500;color:#1a1a1a;margin-bottom:6px;">
            ${formatDate(c.date)}&nbsp;&nbsp;${st} 〜 ${et}
          </div>
          <a href="${confirmUrl}"
            style="display:inline-block;padding:8px 18px;background:#1a1a1a;color:#fff;text-decoration:none;border-radius:6px;font-size:12px;font-weight:500;">
            ✅ この日時で確定する
          </a>
        </div>`;
    }).join("");
    slotsSection = `
      <tr><td style="padding:4px 0 8px;color:#999;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">
        希望日時（${rawCandidates.length}件）
      </td></tr>
      <tr><td style="padding:0 0 14px;">${slotsHtml}</td></tr>`;
  } else {
    const st = startTime.substring(0, 5);
    const et = endTime.substring(0, 5);
    const confirmUrl = `${APP_URL}/api/bookings/${booking.id}/confirm`;
    slotsSection = `
      <tr><td style="padding:4px 0 2px;color:#999;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">日程</td></tr>
      <tr><td style="padding:0 0 14px;color:#1a1a1a;font-size:15px;font-weight:500;">${formatDate(slot.date)}</td></tr>
      <tr><td style="padding:4px 0 2px;color:#999;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">時間</td></tr>
      <tr><td style="padding:0 0 14px;color:#1a1a1a;font-size:15px;font-weight:500;">${st} 〜 ${et}</td></tr>
      <tr><td style="padding:8px 0 14px;">
        <a href="${confirmUrl}" style="display:inline-block;padding:11px 24px;background:#1a1a1a;color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:500;">
          ✅ 予約を確定する
        </a>
      </td></tr>`;
  }

  const mainRows = `
    <tr><td style="padding:4px 0 2px;color:#999;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">参加者</td></tr>
    <tr><td style="padding:0 0 14px;color:#1a1a1a;font-size:15px;font-weight:500;">
      ${booking.guest_name}<br><span style="font-size:13px;color:#888;">${booking.guest_email}</span>
    </td></tr>
    <tr><td style="padding:4px 0 2px;color:#999;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">イベント名</td></tr>
    <tr><td style="padding:0 0 14px;color:#1a1a1a;font-size:15px;font-weight:500;">${event.content_name || event.title}</td></tr>
    ${assigneeName ? `
      <tr><td style="padding:4px 0 2px;color:#999;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">フィードバック担当者</td></tr>
      <tr><td style="padding:0 0 14px;color:#1a1a1a;font-size:15px;font-weight:500;">${assigneeName}</td></tr>` : ""}
    ${booking.notes ? `
      <tr><td style="padding:4px 0 2px;color:#999;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">備考</td></tr>
      <tr><td style="padding:0 0 14px;color:#1a1a1a;font-size:15px;font-weight:500;">${booking.notes}</td></tr>` : ""}
    ${slotsSection}`;

  const declineRow = `
    <tr><td style="padding:12px 0 0;">
      <a href="${declineUrl}" style="display:inline-block;padding:9px 20px;background:#fff;color:#888;text-decoration:none;border-radius:8px;font-size:12px;border:1px solid #d4d4d4;">
        ✗ すべてお断りする
      </a>
    </td></tr>`;

  try {
    const result = await getResend().emails.send({
      from: FROM, to,
      subject: `【予約リクエスト】${booking.guest_name}様 — ${event.title}`,
      html: buildEmailRaw("新規予約リクエストが届きました", event.title, null, mainRows + declineRow, null, "上記のボタンから直接確定できます。管理画面からも操作可能です。"),
    });
    console.log("[email] request notification sent:", result.data?.id, "to:", to);
    return true;
  } catch (e) {
    console.error("[email] sendBookingRequestToHost FAILED:", e);
    return false;
  }
}

// ── 確定メール（参加者宛）────────────────────────────────────
export async function sendConfirmationToGuest(
  event: Event,
  _slot: Slot,
  booking: Booking,
  confirmedSlots: ConfirmedSlotResult[]
): Promise<boolean> {
  const assigneeLabel = getAssigneeLabel(event.title);

  // デバッグログ（本番でも残す — 問題追跡に必要）
  console.log(`[email:guest] event="${event.title}" assigneeLabel="${assigneeLabel}" slots=${confirmedSlots.length}`);
  confirmedSlots.forEach((s, i) => {
    console.log(`[email:guest]   slot[${i}] date=${s.date} assignee_name="${s.assignee_name}"`);
  });

  // 確定日程カード（担当者情報含む）
  const slotsHtml = confirmedSlots.map(s => {
    const st = s.start_time.substring(0, 5);
    const et = s.end_time.substring(0, 5);

    // Phase 2 / Phase 3: assigneeLabel !== null かつ assignee_name が存在する場合のみ表示
    const assigneeRow = (assigneeLabel !== null && s.assignee_name)
      ? `<div style="font-size:13px;color:#333;margin-top:5px;padding-top:5px;border-top:1px solid #ddd;">
           ${assigneeLabel}：<strong>${s.assignee_name}</strong>
         </div>`
      : "";

    return `
      <tr><td style="padding:0 0 10px;">
        <div style="background:${EMAIL_BG};border-radius:8px;padding:12px 16px;">
          <div style="font-size:14px;font-weight:500;color:#1a1a1a;">${formatDate(s.date)}</div>
          <div style="font-size:13px;color:#555;margin-top:2px;">${st} 〜 ${et}</div>
          ${assigneeRow}
        </div>
      </td></tr>`;
  }).join("");

  const eventRow = `
    <tr><td style="padding:4px 0 2px;color:#999;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">イベント名</td></tr>
    <tr><td style="padding:0;color:#1a1a1a;font-size:15px;font-weight:500;">${event.content_name || event.title}</td></tr>`;

  // 本文構造: グリーティング → 日程カード群 → イベント名ボックス → フッター
  const bodyContent = `
    <p style="margin:0 0 20px;color:#555;font-size:14px;line-height:1.7;">${booking.guest_name} 様、以下の日程でイベントが確定しました。</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">${slotsHtml}</table>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${EMAIL_BG};border-radius:10px;padding:20px 24px;">
      ${eventRow}
    </table>`;

  try {
    const result = await getResend().emails.send({
      from: FROM,
      to: booking.guest_email,
      subject: `【予約確定】${event.title}`,
      html: buildEmailBody("予約が確定しました", event.title, bodyContent, "ご不明な点は担当者までお問い合わせください。"),
    });
    console.log("[email] guest confirmation sent:", result.data?.id, "to:", booking.guest_email);
    return true;
  } catch (e) {
    console.error("[email] sendConfirmationToGuest FAILED to:", booking.guest_email, "error:", e);
    return false;
  }
}

// ── 確定通知（担当者＋マスター宛）────────────────────────────
export async function sendConfirmationToHost(
  event: Event,
  _slot: Slot,
  booking: Booking,
  confirmedSlots: ConfirmedSlotResult[]
): Promise<boolean> {
  const toSet = new Set([MASTER_EMAIL, event.host_email]);
  confirmedSlots.forEach(s => { if (s.assignee_email) toSet.add(s.assignee_email); });
  const to = Array.from(toSet);

  const slotsHtml = confirmedSlots.map(s => {
    const st = s.start_time.substring(0, 5);
    const et = s.end_time.substring(0, 5);
    const assigneeRow = s.assignee_name
      ? `<div style="font-size:12px;color:#888;margin-top:3px;">担当者：${s.assignee_name}</div>`
      : "";
    return `
      <tr><td style="padding:0 0 10px;">
        <div style="background:${EMAIL_BG};border-radius:8px;padding:12px 16px;">
          <div style="font-size:14px;font-weight:500;color:#1a1a1a;">${formatDate(s.date)}</div>
          <div style="font-size:13px;color:#555;margin-top:2px;">${st} 〜 ${et}</div>
          ${assigneeRow}
        </div>
      </td></tr>`;
  }).join("");

  const infoRows = `
    <tr><td style="padding:4px 0 2px;color:#999;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">参加者</td></tr>
    <tr><td style="padding:0 0 14px;color:#1a1a1a;font-size:15px;font-weight:500;">
      ${booking.guest_name}<br><span style="font-size:13px;color:#888;">${booking.guest_email}</span>
    </td></tr>
    <tr><td style="padding:4px 0 2px;color:#999;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">イベント名</td></tr>
    <tr><td style="padding:0;color:#1a1a1a;font-size:15px;font-weight:500;">${event.content_name || event.title}</td></tr>`;

  const bodyContent = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">${slotsHtml}</table>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${EMAIL_BG};border-radius:10px;padding:20px 24px;">
      ${infoRows}
    </table>`;

  try {
    const result = await getResend().emails.send({
      from: FROM, to,
      subject: `【予約確定】${booking.guest_name}様 — ${event.title}`,
      html: buildEmailBody("新規予約が確定しました", event.title, bodyContent, "Googleカレンダーへの予定登録とスプレッドシートへの入力をお願いします。"),
    });
    console.log("[email] host confirmation sent:", result.data?.id, "to:", to);
    return true;
  } catch (e) {
    console.error("[email] sendConfirmationToHost FAILED:", e);
    return false;
  }
}

// ── お断りメール ──────────────────────────────────────────────
export async function sendDeclineNotification(
  event: Event,
  slot: Slot,
  booking: Booking
): Promise<boolean> {
  const st = ((booking as any).chosen_start_time || slot.start_time).substring(0, 5);
  const et = ((booking as any).chosen_end_time || slot.end_time).substring(0, 5);

  const bodyContent = `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${EMAIL_BG};border-radius:10px;padding:20px 24px;">
      <tr><td style="padding:0 0 20px;color:#555;font-size:14px;line-height:1.7;">${booking.guest_name} 様</td></tr>
      <tr><td style="padding:4px 0 2px;color:#999;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">ご希望日程</td></tr>
      <tr><td style="padding:0 0 14px;color:#1a1a1a;font-size:15px;font-weight:500;">${formatDate(slot.date)}</td></tr>
      <tr><td style="padding:4px 0 2px;color:#999;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">時間</td></tr>
      <tr><td style="padding:0;color:#1a1a1a;font-size:15px;font-weight:500;">${st} 〜 ${et}</td></tr>
    </table>`;

  try {
    await getResend().emails.send({
      from: FROM,
      to: booking.guest_email,
      subject: `【ご連絡】${event.title} — ご希望日程について`,
      html: buildEmailBody("ご希望日程について", event.title, bodyContent, "誠に恐れ入りますが、上記の日程はご対応が難しい状況です。改めて別の日程をご希望の場合は担当者までご連絡ください。"),
    });
    return true;
  } catch (e) {
    console.error("[email] sendDeclineNotification:", e);
    return false;
  }
}

// ── 汎用メールボックスHTMLビルダー ───────────────────────────
// bodyContent に直接HTMLを渡す（引数ミスを防ぐシンプル構成）
function buildEmailBody(
  headerTitle: string,
  headerSubtitle: string | null,
  bodyContent: string,
  footer: string | null
): string {
  return `
<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:${EMAIL_BG};font-family:'Hiragino Kaku Gothic ProN','Hiragino Sans',Arial,sans-serif;color:#1a1a1a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="border-radius:14px;overflow:hidden;">
        <tr><td style="background:${HEADER_BG};padding:28px 36px;">
          ${headerSubtitle ? `<p style="margin:0 0 6px;color:#666;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;">${headerSubtitle}</p>` : ""}
          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:500;">${headerTitle}</h1>
        </td></tr>
        <tr><td style="background:${CARD_BG};padding:32px 36px;">
          ${bodyContent}
        </td></tr>
        ${footer ? `
        <tr><td style="background:${CARD_BG};padding:16px 36px 28px;border-top:1px solid #ddd;">
          <p style="margin:0;color:#aaa;font-size:12px;line-height:1.7;">${footer}</p>
        </td></tr>` : ""}
        <tr><td style="background:${EMAIL_BG};padding:14px 36px;border-top:1px solid #ddd;">
          <p style="margin:0;color:#ccc;font-size:11px;">Mentorship Scheduler</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// 旧 buildEmailRaw との後方互換（confirm/decline ルートが直接呼ぶケースに対応）
export function buildEmailRaw(
  headerTitle: string,
  headerSubtitle: string | null,
  greeting: string | null,
  tableRows: string,
  extraRows: string | null,
  footer: string | null,
  topSlots?: string
): string {
  const bodyContent = `
    ${greeting ? `<p style="margin:0 0 20px;color:#555;font-size:14px;line-height:1.7;">${greeting}</p>` : ""}
    ${topSlots ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">${topSlots}</table>` : ""}
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${EMAIL_BG};border-radius:10px;padding:20px 24px;">
      ${tableRows}
    </table>
    ${extraRows || ""}`;
  return buildEmailBody(headerTitle, headerSubtitle, bodyContent, footer);
}
