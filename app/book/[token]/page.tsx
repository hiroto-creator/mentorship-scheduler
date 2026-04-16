"use client";
import React, { useState, useEffect } from "react";
import { Calendar, Clock, User, CheckCircle, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { formatDate, formatTime, groupSlotsByDate } from "@/lib/utils";
import type { EventWithSlots, Slot } from "@/types";

const BG = "#EBEBEB";
const CARD_BG = "#f5f5f5";
const BORDER = "#d4d4d4";
const JA = "'Hiragino Kaku Gothic ProN','Hiragino Sans',sans-serif";

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
}

function generateStartTimes(startTime: string, endTime: string, durationMins: number): string[] {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const startTotal = sh * 60 + sm;
  const endTotal   = eh * 60 + em;
  const times: string[] = [];
  for (let t = startTotal; t + durationMins <= endTotal; t += 30) {
    const h = Math.floor(t / 60).toString().padStart(2, "0");
    const mn = (t % 60).toString().padStart(2, "0");
    times.push(`${h}:${mn}`);
  }
  return times;
}

// 選択中の候補1件
interface SelectedEntry { slotId: string; date: string; startTime: string; endTime: string; }

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg ${className}`} style={{ background: "#ddd" }} />;
}

export default function BookingPage({ params }: { params: { token: string } }) {
  const [event, setEvent] = useState<EventWithSlots | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  // 複数選択: { key: slotId+startTime }
  const [selected, setSelected] = useState<Map<string, SelectedEntry>>(new Map());
  const [guestName,  setGuestName]  = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [notes,      setNotes]      = useState("");
  const [step,      setStep]      = useState<"select" | "form" | "done">("select");
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(`/api/events/token/${params.token}`)
      .then(r => r.json())
      .then(json => { if (json.error) throw new Error(json.error); setEvent(json.data); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.token]);

  const slotsByDate = event ? groupSlotsByDate(event.slots) : {};
  const sortedDates = Object.keys(slotsByDate).sort();
  const duration    = event?.duration_minutes ?? 60;
  const selectedArr = Array.from(selected.values());

  function toggleTime(slot: Slot, startTime: string) {
    const endTime = addMinutes(startTime, duration);
    const key = `${slot.id}__${startTime}`;
    setSelected(prev => {
      const next = new Map(prev);
      if (next.has(key)) { next.delete(key); }
      else { next.set(key, { slotId: slot.id, date: slot.date, startTime, endTime }); }
      return next;
    });
  }

  function isSelected(slotId: string, startTime: string) {
    return selected.has(`${slotId}__${startTime}`);
  }

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!guestName.trim())  errs.name  = "お名前を入力してください";
    if (!guestEmail.trim()) errs.email = "メールアドレスを入力してください";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) errs.email = "有効なメールアドレスを入力してください";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || selectedArr.length === 0) return;
    setSubmitting(true);
    try {
      // 最初の候補をメインslot_idとして使用（後方互換性）
      const first = selectedArr[0];
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot_id:           first.slotId,
          chosen_start_time: first.startTime,
          chosen_end_time:   first.endTime,
          candidate_slots:   selectedArr,
          guest_name:  guestName,
          guest_email: guestEmail,
          notes: notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setStep("done");
    } catch (e: any) {
      setFormErrors({ submit: e.message || "送信に失敗しました。もう一度お試しください。" });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ──
  if (loading) return (
    <div className="min-h-screen" style={{ background: BG }}>
      <div className="max-w-xl mx-auto px-6 pt-16 pb-20 space-y-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-10 w-3/4" />
        {[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}
      </div>
    </div>
  );

  // ── Error ──
  if (error || !event) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: BG }}>
      <div className="text-center max-w-sm">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-6" style={{ background: "#fee2e2" }}>
          <AlertCircle className="w-7 h-7 text-red-400" />
        </div>
        <h1 className="text-xl font-medium mb-2" style={{ color: "#1a1a1a" }}>ページが見つかりません</h1>
        <p className="text-sm" style={{ color: "#888" }}>URLが正しいかご確認ください。</p>
      </div>
    </div>
  );

  // ── Done ──
  if (step === "done") return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: BG, fontFamily: JA }}>
      <div className="text-center max-w-sm animate-slide-up">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border mb-7" style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}>
          <CheckCircle className="w-8 h-8 text-emerald-500" />
        </div>
        <h1 className="text-2xl font-medium mb-3" style={{ color: "#1a1a1a" }}>ご希望を受け付けました</h1>
        <p className="text-sm leading-relaxed mb-8" style={{ color: "#888" }}>
          担当者が日程を確認後、確定メールをお送りします。<br />しばらくお待ちください。
        </p>
        <div className="rounded-2xl p-5 text-left space-y-3 border" style={{ background: CARD_BG, borderColor: BORDER }}>
          <div className="flex items-center gap-2 text-sm">
            <User className="w-3.5 h-3.5" style={{ color: "#aaa" }} />
            <span style={{ color: "#888" }}>氏名</span>
            <span className="font-medium ml-auto" style={{ color: "#1a1a1a" }}>{guestName}</span>
          </div>
          <div>
            <p className="text-xs mb-2" style={{ color: "#bbb" }}>選択した候補日時 ({selectedArr.length}件)</p>
            {selectedArr.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-xs py-1.5 border-t" style={{ borderColor: "#e8e8e8", color: "#555" }}>
                <Calendar className="w-3 h-3" style={{ color: "#aaa" }} />
                <span>{formatDate(s.date)}</span>
                <Clock className="w-3 h-3 ml-2" style={{ color: "#aaa" }} />
                <span>{s.startTime}〜{s.endTime}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ── Form step ──
  if (step === "form") return (
    <div className="min-h-screen" style={{ background: BG, fontFamily: JA }}>
      <div className="max-w-xl mx-auto px-6 pt-14 pb-24 animate-slide-up">
        <button onClick={() => setStep("select")} className="text-xs mb-10 block transition-colors" style={{ color: "#aaa" }}>
          ← 日程選択に戻る
        </button>

        {/* 選択候補サマリー */}
        <div className="mb-10 rounded-2xl p-5 border" style={{ background: CARD_BG, borderColor: BORDER }}>
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "#bbb" }}>選択した候補日時 ({selectedArr.length}件)</p>
          {selectedArr.map((s, i) => (
            <div key={i} className="flex items-center gap-3 text-sm py-2 border-t first:border-0" style={{ borderColor: "#e8e8e8" }}>
              <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: "#aaa" }} />
              <span className="font-medium" style={{ color: "#333" }}>{formatDate(s.date)}</span>
              <Clock className="w-3.5 h-3.5 shrink-0 ml-1" style={{ color: "#aaa" }} />
              <span style={{ color: "#555" }}>{s.startTime} – {s.endTime}</span>
            </div>
          ))}
        </div>

        <h2 className="text-[1.6rem] font-medium mb-8" style={{ color: "#1a1a1a" }}>お客様情報の入力</h2>
        <div className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest mb-1.5" style={{ color: "#999" }}>
              お名前 <span className="text-red-400">*</span>
            </label>
            <input type="text" placeholder="山田 花子" value={guestName} onChange={e => setGuestName(e.target.value)}
              className={`w-full h-11 px-4 text-sm rounded-xl border outline-none transition-all ${formErrors.name ? "border-red-300" : "focus:border-[#1a1a1a]"}`}
              style={{ background: CARD_BG, borderColor: formErrors.name ? undefined : BORDER, color: "#1a1a1a" }} />
            {formErrors.name && <p className="mt-1 text-xs text-red-500">{formErrors.name}</p>}
          </div>
          {/* Email */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest mb-1.5" style={{ color: "#999" }}>
              メールアドレス <span className="text-red-400">*</span>
            </label>
            <input type="email" placeholder="hanako@example.com" value={guestEmail} onChange={e => setGuestEmail(e.target.value)}
              className={`w-full h-11 px-4 text-sm rounded-xl border outline-none transition-all ${formErrors.email ? "border-red-300" : "focus:border-[#1a1a1a]"}`}
              style={{ background: CARD_BG, borderColor: formErrors.email ? undefined : BORDER, color: "#1a1a1a" }} />
            {formErrors.email && <p className="mt-1 text-xs text-red-500">{formErrors.email}</p>}
            <p className="mt-1.5 text-xs" style={{ color: "#bbb" }}>確定通知はこちらのアドレスにお送りします</p>
          </div>
          {/* Notes */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest mb-1.5" style={{ color: "#999" }}>ご要望・備考（任意）</label>
            <textarea placeholder="相談したい内容や質問など" value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              className="w-full px-4 py-3 text-sm rounded-xl border outline-none transition-all resize-none focus:border-[#1a1a1a]"
              style={{ background: CARD_BG, borderColor: BORDER, color: "#1a1a1a" }} />
          </div>
          {formErrors.submit && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-red-600" style={{ background: "#fee2e2", border: "1px solid #fecaca" }}>
              <AlertCircle className="w-4 h-4 shrink-0" />{formErrors.submit}
            </div>
          )}
        </div>
        <div className="mt-8">
          <button onClick={handleSubmit} disabled={submitting}
            className="w-full h-12 flex items-center justify-center gap-2 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-40"
            style={{ background: "#1a1a1a" }}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {submitting ? "送信中..." : `${selectedArr.length}件の候補で予約をリクエストする`}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Slot selection (複数選択) ──
  return (
    <div className="min-h-screen" style={{ background: BG, fontFamily: JA }}>
      <div className="max-w-xl mx-auto px-6 pt-14 pb-32">
        {/* Header */}
        <div className="mb-10 animate-slide-down">
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "#bbb" }}>
            {event.host_name} よりご招待
          </p>
          <h1 className="font-medium leading-tight mb-3" style={{ color: "#1a1a1a", fontSize: "clamp(1.7rem,5vw,2.4rem)" }}>
            {event.title}
          </h1>
          <div className="flex flex-wrap gap-4 text-sm" style={{ color: "#888" }}>
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{duration}分</span>
          </div>
          {event.description && (
            <p className="mt-4 text-sm leading-relaxed pl-4" style={{ color: "#888", borderLeft: "2px solid #ccc" }}>
              {event.description}
            </p>
          )}
        </div>

        <p className="text-xs font-medium uppercase tracking-widest mb-5" style={{ color: "#aaa" }}>
          ご希望の日程・時間をお選びください（複数選択可）
        </p>

        {sortedDates.length === 0 ? (
          <div className="text-center py-12 text-sm" style={{ color: "#bbb" }}>現在、空き日程がありません</div>
        ) : (
          <div className="space-y-7">
            {sortedDates.map((date, di) => {
              const slotsForDate = slotsByDate[date].filter((s: any) => s.is_available !== false);
              return (
                <div key={date} className="animate-slide-up" style={{ animationDelay: `${di * 50}ms`, animationFillMode: "both" }}>
                  <p className="text-sm font-medium mb-2 flex items-center gap-2" style={{ color: "#555" }}>
                    <Calendar className="w-3.5 h-3.5" style={{ color: "#aaa" }} />{formatDate(date)}
                  </p>
                  {slotsForDate.map((slot: any) => {
                    const times = generateStartTimes(formatTime(slot.start_time), formatTime(slot.end_time), duration);
                    return (
                      <div key={slot.id} className="mb-3">
                        <p className="text-[11px] mb-2" style={{ color: "#bbb" }}>
                          受付時間帯: {formatTime(slot.start_time)} 〜 {formatTime(slot.end_time)}
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                          {times.map(st => {
                            const et = addMinutes(st, duration);
                            const sel = isSelected(slot.id, st);
                            return (
                              <button key={st} onClick={() => toggleTime(slot, st)}
                                className="flex flex-col items-center py-3 px-2 rounded-xl border text-sm transition-all duration-150 select-none"
                                style={{
                                  background: sel ? "#1a1a1a" : CARD_BG,
                                  borderColor: sel ? "#1a1a1a" : BORDER,
                                  color: sel ? "#fff" : "#333",
                                }}>
                                <span className="font-medium">{st}</span>
                                <span className="text-xs mt-0.5" style={{ color: sel ? "#aaa" : "#999" }}>〜{et}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* 固定フッター: 選択数バッジ + 次へボタン */}
        <div className="fixed bottom-0 left-0 right-0 p-4" style={{ background: "#EBEBEB", borderTop: "1px solid #d4d4d4" }}>
          <div className="max-w-xl mx-auto">
            <button
              onClick={() => selectedArr.length > 0 && setStep("form")}
              disabled={selectedArr.length === 0}
              className="w-full h-12 flex items-center justify-center gap-2 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-30"
              style={{ background: "#1a1a1a" }}
            >
              {selectedArr.length > 0
                ? <><span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold bg-white text-gray-900">{selectedArr.length}</span>件を選択 — 次へ <ChevronRight className="w-4 h-4" /></>
                : "日程を選択してください"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
