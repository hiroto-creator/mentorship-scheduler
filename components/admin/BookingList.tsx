"use client";
import React, { useState, useEffect } from "react";
import { CheckCircle, Clock, User, Calendar, Loader2, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/card";
import { formatDate, formatTime } from "@/lib/utils";
import type { EventWithSlots } from "@/types";

const BORDER = "#d4d4d4";

interface Props {
  event: EventWithSlots;
  onRefresh: () => void;
  toast: (msg: string, type?: "success" | "error" | "info") => void;
}

// ゲストが送信してきた候補スロット
interface CandidateSlot {
  slotId: string;
  date: string;
  startTime: string;
  endTime: string;
}

// DBに保存される確定済みスロット
interface ConfirmedSlot {
  slot_id: string;
  date: string;
  start_time: string;
  end_time: string;
  assignee_name?: string | null;
  google_event_id?: string | null;
  meet_link?: string | null;
  calendar_ok?: boolean;
}

interface BookingRow {
  id: string;
  guest_name: string;
  guest_email: string;
  status: string;
  notes?: string;
  confirmed_at?: string;
  chosen_start_time?: string;
  chosen_end_time?: string;
  confirmed_slots?: ConfirmedSlot[];
  // ゲストが選んだ複数候補（guest booking POST時に保存）
  candidate_slots?: CandidateSlot[];
  slots: {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    assignee_name?: string;
    assignee_email?: string;
  };
  events: {
    id: string;
    title: string;
    duration_minutes: number;
  };
}

export function BookingList({ event, onRefresh, toast }: Props) {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadBookings(); }, [event.id]);

  async function loadBookings() {
    setLoading(true);
    const res = await fetch(`/api/bookings?event_id=${event.id}`);
    const json = await res.json();
    setBookings(json.data || []);
    setLoading(false);
  }

  const pending = bookings.filter(b => b.status === "pending");
  const confirmed = bookings.filter(b => b.status === "confirmed");
  const cancelled = bookings.filter(b => b.status === "cancelled");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-[#1a1a1a]">予約一覧</p>
          <div className="flex items-center gap-2">
            {pending.length > 0 && <Badge variant="warning">{pending.length} 未確定</Badge>}
            {confirmed.length > 0 && <Badge variant="success">{confirmed.length} 確定済み</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        {loading && <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "#ccc" }} /></div>}

        {!loading && bookings.length === 0 && (
          <div className="text-center py-10">
            <Calendar className="w-7 h-7 mx-auto mb-2" style={{ color: "#ccc" }} />
            <p className="text-sm" style={{ color: "#9a9a9a" }}>まだ予約はありません</p>
          </div>
        )}

        {pending.map(b => (
          <PendingBookingCard
            key={b.id}
            booking={b}
            event={event}
            onConfirmed={() => { loadBookings(); onRefresh(); }}
            toast={toast}
          />
        ))}

        {confirmed.map(b => (
          <ConfirmedBookingCard key={b.id} booking={b} />
        ))}

        {cancelled.map(b => (
          <div key={b.id} className="flex items-center gap-3 rounded-lg px-4 py-3 opacity-50" style={{ background: "#e8e8e8" }}>
            <User className="w-3.5 h-3.5 text-[#aaa]" />
            <span className="text-sm text-[#666]">{b.guest_name}</span>
            <Badge variant="outline">キャンセル済み</Badge>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}

// ── 未確定カード（複数候補を選んで一括確定）──────────────────
function PendingBookingCard({ booking, event, onConfirmed, toast }: {
  booking: BookingRow;
  event: EventWithSlots;
  onConfirmed: () => void;
  toast: (msg: string, type?: "success" | "error" | "info") => void;
}) {
  const slot = booking.slots;
  const duration = event.duration_minutes;

  // Phase 2修正: candidate_slots があればそれを使う。なければ単一slotから生成
  const availableChoices: Array<{
    key: string;
    slotId: string;
    date: string;
    startTime: string;
    endTime: string;
    assigneeName?: string | null;
    assigneeEmail?: string | null;
  }> = (() => {
    if (booking.candidate_slots?.length) {
      return booking.candidate_slots.map(c => ({
        key: `${c.slotId}_${c.startTime}`,
        slotId: c.slotId,
        date: c.date,
        startTime: c.startTime,
        endTime: c.endTime,
        assigneeName: slot.assignee_name,
        assigneeEmail: slot.assignee_email,
      }));
    }
    // 後方互換: 単一スロット
    const st = (booking.chosen_start_time || slot.start_time).substring(0, 5);
    const et = (booking.chosen_end_time || slot.end_time).substring(0, 5);
    return [{
      key: `${slot.id}_${st}`,
      slotId: slot.id,
      date: slot.date,
      startTime: st,
      endTime: et,
      assigneeName: slot.assignee_name,
      assigneeEmail: slot.assignee_email,
    }];
  })();

  // Phase 3: デフォルトは0件（未選択）
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);

  function toggleChoice(key: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleConfirm() {
    if (selected.size === 0) { toast("確定する日時を1つ以上選択してください", "error"); return; }
    setConfirming(true);

    const confirmedSlots = availableChoices
      .filter(c => selected.has(c.key))
      .map(c => ({
        slot_id: c.slotId,
        date: c.date,
        start_time: c.startTime.length === 5 ? c.startTime + ":00" : c.startTime,
        end_time: c.endTime.length === 5 ? c.endTime + ":00" : c.endTime,
        assignee_name: c.assigneeName,
        assignee_email: c.assigneeEmail,
      }));

    try {
      const res = await fetch(`/api/bookings/${booking.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed_slots: confirmedSlots }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "確定処理に失敗しました");
      toast(`${confirmedSlots.length}件の予約を確定しました`, "success");
      onConfirmed();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="rounded-xl border p-4 space-y-3" style={{ background: "#f5f5f5", borderColor: BORDER }}>
      {/* ゲスト情報 */}
      <div className="flex items-start gap-2">
        <User className="w-3.5 h-3.5 text-[#aaa] mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-[#1a1a1a]">{booking.guest_name}</span>
            <Badge variant="warning">未確定</Badge>
          </div>
          <p className="text-xs" style={{ color: "#888" }}>{booking.guest_email}</p>
          {booking.notes && <p className="text-xs mt-0.5 italic" style={{ color: "#aaa" }}>「{booking.notes}」</p>}
        </div>
      </div>

      {/* 候補日時の選択 */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: "#999" }}>
          確定する日時を選択（複数可）
        </p>
        <div className="space-y-1.5">
          {availableChoices.map(c => {
            const isChecked = selected.has(c.key);
            const st = c.startTime.substring(0, 5);
            const et = c.endTime.substring(0, 5);
            return (
              <button
                key={c.key}
                onClick={() => toggleChoice(c.key)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-left"
                style={{
                  background: isChecked ? "#1a1a1a" : "#ebebeb",
                  borderColor: isChecked ? "#1a1a1a" : BORDER,
                }}
              >
                {isChecked
                  ? <CheckSquare className="w-4 h-4 shrink-0 text-white" />
                  : <Square className="w-4 h-4 shrink-0 text-[#aaa]" />
                }
                <span className={`text-sm font-medium flex-1 ${isChecked ? "text-white" : "text-[#333]"}`}>
                  {formatDate(c.date)}
                </span>
                <span className={`text-xs ${isChecked ? "text-gray-300" : "text-[#888]"}`}>
                  {st} 〜 {et}
                </span>
                {c.assigneeName && (
                  <span className={`text-xs flex items-center gap-1 shrink-0 ${isChecked ? "text-gray-300" : "text-[#aaa]"}`}>
                    <User size={10} />{c.assigneeName}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <Button size="sm" onClick={handleConfirm} isLoading={confirming} disabled={selected.size === 0}>
          <CheckCircle className="w-3.5 h-3.5" />
          選択した {selected.size} 件を確定する
        </Button>
      </div>
    </div>
  );
}

// ── 確定済みカード ────────────────────────────────────────────
function ConfirmedBookingCard({ booking }: { booking: BookingRow }) {
  const slot = booking.slots;
  const confirmedSlots: ConfirmedSlot[] = booking.confirmed_slots || [];

  return (
    <div className="rounded-xl border p-4" style={{ background: "#f5f5f5", borderColor: BORDER }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <User className="w-3.5 h-3.5 text-[#aaa]" />
          <span className="text-sm font-medium text-[#1a1a1a]">{booking.guest_name}</span>
          <Badge variant="success"><CheckCircle className="w-3 h-3" />確定済み</Badge>
        </div>
        <p className="text-xs" style={{ color: "#888" }}>{booking.guest_email}</p>
      </div>

      {confirmedSlots.length > 0 ? (
        <div className="space-y-1">
          {confirmedSlots.map((s, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: "#e8e8e8" }}>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="text-xs text-[#333] flex-1">{formatDate(s.date)}</span>
              <span className="text-xs text-[#888]">
                {s.start_time.substring(0,5)} 〜 {s.end_time.substring(0,5)}
              </span>
              {s.meet_link && (
                <a href={s.meet_link} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline shrink-0">Meet</a>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: "#e8e8e8" }}>
          <Calendar className="w-3.5 h-3.5 text-[#aaa]" />
          <span className="text-xs text-[#333]">{formatDate(slot.date)}</span>
          <span className="text-xs text-[#888]">
            {(booking.chosen_start_time || slot.start_time).substring(0,5)} 〜
            {(booking.chosen_end_time || slot.end_time).substring(0,5)}
          </span>
        </div>
      )}

      {booking.confirmed_at && (
        <p className="text-xs mt-2" style={{ color: "#bbb" }}>
          確定: {new Intl.DateTimeFormat("ja-JP", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" }).format(new Date(booking.confirmed_at))}
        </p>
      )}
    </div>
  );
}
