"use client";
import React, { useState } from "react";
import { Plus, Trash2, Calendar, ChevronUp, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { formatDate, formatTime, groupSlotsByDate } from "@/lib/utils";
import type { EventWithSlots } from "@/types";

const BORDER = "#d4d4d4";
const BG_INPUT = "#f0f0f0";
const SEL_CLS = "h-9 rounded-[7px] border text-[13px] focus:outline-none focus:border-[#1a1a1a] focus:ring-1 focus:ring-[#1a1a1a] px-2";

// 担当者マスターデータ（名前選択でメール自動設定）
const STAFF_OPTIONS = [
  { name: "飯倉 孝史",   email: "iikura@kuppography.com" },
  { name: "小林 俊介",   email: "kobashun@kuppography.com" },
  { name: "佐々木 大翔", email: "hiroto@kuppography.com" },
  { name: "坂本 楓花",   email: "sakamoto@kuppography.com" },
  { name: "山口 葵",     email: "ao@kuppography.com" },
  { name: "川上 輝",     email: "h.kawakami@kuppography.com" },
] as const;

// 時刻選択肢: 9:00〜22:00、30分おき
function generateTimeOptions(): string[] {
  const times: string[] = [];
  for (let h = 9; h <= 22; h++) {
    for (const m of [0, 30]) {
      if (h === 22 && m === 30) continue;
      times.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return times;
}
const TIME_OPTIONS = generateTimeOptions();

function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className={SEL_CLS}
      style={{ background: BG_INPUT, borderColor: BORDER, width: "90px" }}>
      {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
    </select>
  );
}

interface Props {
  event: EventWithSlots;
  onRefresh: () => void;
  toast: (msg: string, type?: "success" | "error" | "info") => void;
}

interface SlotRow {
  date: string;
  start_time: string;
  end_time: string;
  assignee_name: string;
  assignee_email: string; // 担当者選択で自動設定
}

export function SlotPicker({ event, onRefresh, toast }: Props) {
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<SlotRow[]>([
    { date: "", start_time: "10:00", end_time: "18:00", assignee_name: "", assignee_email: "" },
  ]);

  const grouped = groupSlotsByDate(event.slots || []);
  const sortedDates = Object.keys(grouped).sort();

  function addRow() {
    setRows(r => [...r, { date: "", start_time: "10:00", end_time: "18:00", assignee_name: "", assignee_email: "" }]);
  }
  function removeRow(i: number) {
    if (rows.length === 1) return;
    setRows(r => r.filter((_, idx) => idx !== i));
  }
  function updateRow(i: number, field: keyof SlotRow, value: string) {
    setRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: value } : row));
  }
  // 担当者選択時にメールを自動設定
  function handleAssigneeChange(i: number, name: string) {
    const staff = STAFF_OPTIONS.find(s => s.name === name);
    setRows(r => r.map((row, idx) => idx === i
      ? { ...row, assignee_name: name, assignee_email: staff?.email || "" }
      : row
    ));
  }

  async function handleAdd() {
    const valid = rows.filter(r => r.date && r.start_time && r.end_time);
    if (!valid.length) { toast("日付と時間を入力してください", "error"); return; }

    // Phase 1-2: フィードバック担当者は必須
    const missingAssignee = valid.find(r => !r.assignee_name);
    if (missingAssignee) {
      toast("フィードバック担当者を選択してください", "error");
      return;
    }

    setLoading(true);
    const payload = valid.map(r => ({
      event_id: event.id,
      date: r.date,
      start_time: r.start_time + ":00",
      end_time: r.end_time + ":00",
      assignee_name: r.assignee_name,
      assignee_email: r.assignee_email,  // 必ずメールアドレスを送る
    }));

    const res = await fetch("/api/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      toast(`${valid.length}件の候補日時を追加しました`, "success");
      setAdding(false);
      setRows([{ date: "", start_time: "10:00", end_time: "18:00", assignee_name: "", assignee_email: "" }]);
      await onRefresh();
    } else {
      const j = await res.json();
      toast(j.error || "追加に失敗しました", "error");
    }
    setLoading(false);
  }

  async function deleteSlot(id: string) {
    const res = await fetch(`/api/slots?id=${id}`, { method: "DELETE" });
    if (res.ok) { toast("削除しました", "success"); await onRefresh(); }
  }

  const inputCls = "h-9 rounded-[7px] border px-2.5 text-[13px] focus:outline-none focus:border-[#1a1a1a] focus:ring-1 focus:ring-[#1a1a1a]";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[#1a1a1a]">候補日時</p>
            <p className="text-xs mt-0.5" style={{ color: "#9a9a9a" }}>{event.slots?.length ?? 0} 件の候補</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setAdding(!adding)}>
            {adding ? <ChevronUp size={13} /> : <Plus size={13} />}
            {adding ? "閉じる" : "追加"}
          </Button>
        </div>
      </CardHeader>

      <CardBody className="space-y-4">
        {adding && (
          <div className="rounded-xl border p-4 animate-slide-down space-y-3" style={{ background: "#eeeeee", borderColor: BORDER }}>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#9a9a9a" }}>
              候補日時を追加（複数まとめて登録可）
            </p>

            {/* ヘッダー */}
            <div className="grid grid-cols-[1fr_90px_90px_1fr] gap-2 text-[11px] font-medium" style={{ color: "#888" }}>
              <span>日付</span>
              <span>開始</span>
              <span>終了</span>
              {/* フィードバック担当者（必須） */}
              <span>フィードバック担当者 <span style={{ color: "#e44" }}>*</span></span>
            </div>

            {rows.map((row, i) => (
              <div key={i} className="space-y-1">
                <div className="grid grid-cols-[1fr_90px_90px_1fr_24px] gap-2 items-center">
                  <input type="date" value={row.date}
                    onChange={(e) => updateRow(i, "date", e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className={inputCls}
                    style={{ background: BG_INPUT, borderColor: BORDER }}
                  />
                  <TimeSelect value={row.start_time} onChange={(v) => updateRow(i, "start_time", v)} />
                  <TimeSelect value={row.end_time} onChange={(v) => updateRow(i, "end_time", v)} />
                  {/* 担当者プルダウン（必須） */}
                  <select
                    value={row.assignee_name}
                    onChange={(e) => handleAssigneeChange(i, e.target.value)}
                    required
                    className={SEL_CLS}
                    style={{ background: BG_INPUT, borderColor: !row.assignee_name ? "#f87171" : BORDER, width: "100%" }}
                  >
                    <option value="">選択必須</option>
                    {STAFF_OPTIONS.map(s => (
                      <option key={s.name} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                  <button onClick={() => removeRow(i)} disabled={rows.length === 1}
                    className="w-6 h-6 flex items-center justify-center rounded text-[#aaa] hover:text-red-500 disabled:opacity-20">
                    <Trash2 size={12} />
                  </button>
                </div>
                {/* 選択されたメールアドレスを表示 */}
                {row.assignee_email && (
                  <p className="text-[11px] pl-1" style={{ color: "#999" }}>
                    メール: {row.assignee_email}
                  </p>
                )}
              </div>
            ))}

            <div className="flex items-center justify-between pt-1">
              <button onClick={addRow} className="text-xs flex items-center gap-1" style={{ color: "#888" }}>
                <Plus size={11} /> 行を追加
              </button>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAdd} isLoading={loading}>
                  {rows.filter(r => r.date).length}件を一括追加
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>キャンセル</Button>
              </div>
            </div>
          </div>
        )}

        {sortedDates.length === 0 && !adding && (
          <div className="text-center py-10">
            <Calendar size={26} className="mx-auto mb-2" style={{ color: "#ccc" }} />
            <p className="text-sm" style={{ color: "#9a9a9a" }}>候補日時がありません</p>
          </div>
        )}

        {sortedDates.map((date) => (
          <div key={date}>
            <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "#9a9a9a" }}>
              {formatDate(date)}
            </p>
            <div className="space-y-1.5">
              {(grouped[date] as any[]).map((slot) => (
                <div key={slot.id}
                  className="flex items-center justify-between rounded-lg px-4 py-2.5 group"
                  style={{ background: "#e8e8e8" }}>
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="text-sm font-medium text-[#333]">
                      {formatTime(slot.start_time)} 〜 {formatTime(slot.end_time)}
                    </span>
                    {slot.assignee_name && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: "#888" }}>
                        <User size={10} />{slot.assignee_name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      slot.is_available ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#FEE2E2] text-[#991B1B]"
                    }`}>
                      {slot.is_available ? "空き" : "予約済み"}
                    </span>
                    {slot.is_available && (
                      <button onClick={() => deleteSlot(slot.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-[#aaa] hover:text-red-500">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
