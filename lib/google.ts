import { google } from "googleapis";
import type { Event, Slot, Booking } from "@/types";

// パターンA: 担当者(assignee)のカレンダーに登録するイベント名
const PATTERN_A = ["1on1 フィードバック", "撮影見学", "撮影体験"];

// 有効なスプレッドシートのタブ名
const VALID_SHEETS = ["1on1 フィードバック", "撮影見学", "撮影体験", "レビュー会", "交流会"];

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || "1UgzxBZG9Sygtu1JZFKYCRgQoyi6SXr924iBk_vTRkrg";

function getOAuth2Client() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return oauth2Client;
}

// ── Google Calendar + Meet ────────────────────────────────
export async function createCalendarEventWithMeet(
  event: Event, slot: Slot, booking: Booking,
  startTime: string, endTime: string
): Promise<{ eventId: string; meetLink: string | null } | null> {
  const auth = getOAuth2Client();
  const calendar = google.calendar({ version: "v3", auth });

  const st = startTime.substring(0, 5);
  const et = endTime.substring(0, 5);
  const startDateTime = `${slot.date}T${st}:00`;
  const endDateTime   = `${slot.date}T${et}:00`;

  const isPatternA    = PATTERN_A.some(n => event.title.includes(n));
  const assigneeEmail = (slot as any).assignee_email as string | null;
  const assigneeName  = (slot as any).assignee_name  as string | null;

  const attendees: { email: string; displayName?: string }[] = [
    { email: booking.guest_email, displayName: booking.guest_name },
  ];
  if (isPatternA && assigneeEmail) {
    attendees.push({ email: assigneeEmail, displayName: assigneeName || undefined });
    console.log(`[Calendar] Pattern A — adding assignee: ${assigneeEmail}`);
  } else {
    attendees.push({ email: event.host_email, displayName: event.host_name });
    console.log(`[Calendar] Pattern B — adding host: ${event.host_email}`);
  }

  const result = await calendar.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
    sendUpdates: "all",
    conferenceDataVersion: 1,
    requestBody: {
      summary: `${event.title} — ${booking.guest_name}`,
      description: [
        event.description || "",
        `参加者: ${booking.guest_name} (${booking.guest_email})`,
        event.content_name ? `イベント名: ${event.content_name}` : "",
        booking.notes ? `備考: ${booking.notes}` : "",
      ].filter(Boolean).join("\n"),
      start: { dateTime: startDateTime, timeZone: "Asia/Tokyo" },
      end:   { dateTime: endDateTime,   timeZone: "Asia/Tokyo" },
      attendees,
      conferenceData: {
        createRequest: {
          requestId: `meet-${booking.id}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [{ method: "email", minutes: 1440 }, { method: "popup", minutes: 30 }],
      },
    },
  });

  const meetLink = result.data.conferenceData?.entryPoints?.find(
    ep => ep.entryPointType === "video"
  )?.uri || null;

  console.log(`[Calendar] Created: ${result.data.id} | Meet: ${meetLink}`);
  return { eventId: result.data.id || "", meetLink };
}

// ── Google Sheets — タブ名をイベントタイトルから厳密マッチング ──
export async function appendToSpreadsheet(
  event: Event, slot: Slot, booking: Booking,
  startTime: string, endTime: string, meetLink: string | null
): Promise<boolean> {
  // タブ名の厳密マッチング
  const sheetName = VALID_SHEETS.find(s => event.title.includes(s));
  if (!sheetName) {
    console.error(`\x1b[31m[Sheets Error] No matching sheet for event title: "${event.title}". Valid: ${VALID_SHEETS.join(", ")}\x1b[0m`);
    return false;
  }

  const auth = getOAuth2Client();
  const sheets = google.sheets({ version: "v4", auth });

  const confirmedAt = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo",
  }).format(new Date());

  const dateFormatted = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric", month: "2-digit", day: "2-digit",
    weekday: "short", timeZone: "Asia/Tokyo",
  }).format(new Date(slot.date + "T00:00:00"));

  const assigneeName = (slot as any).assignee_name as string | null;

  // 列: 氏名 | メール | 日程 | 開始 | 終了 | 担当者 | イベント名 | Meet | 登録日時
  const row = [
    booking.guest_name,
    booking.guest_email,
    dateFormatted,
    startTime.substring(0, 5),
    endTime.substring(0, 5),
    assigneeName || "",
    event.content_name || event.title,
    meetLink || "",
    confirmedAt,
  ];

  const result = await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:I`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });

  console.log(`[Sheets] Appended to "${sheetName}": ${result.data.updates?.updatedRange}`);
  return true;
}

// ── OAuth helpers ─────────────────────────────────────────
export function getAuthUrl(): string {
  return getOAuth2Client().generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/spreadsheets",
    ],
    prompt: "consent",
  });
}

export async function getTokensFromCode(code: string) {
  try {
    const { tokens } = await getOAuth2Client().getToken(code);
    return { access_token: tokens.access_token || "", refresh_token: tokens.refresh_token || "" };
  } catch (e) {
    console.error("\x1b[31m[OAuth Error]\x1b[0m", e);
    return null;
  }
}
