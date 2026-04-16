"use client";
import React, { useState, useEffect } from "react";
import { Plus, Copy, Check, Trash2, Calendar, Users, ExternalLink, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/card";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { formatDate, formatTime, groupSlotsByDate } from "@/lib/utils";
import type { EventWithSlots } from "@/types";
import { SlotPicker } from "@/components/admin/SlotPicker";
import { BookingList } from "@/components/admin/BookingList";

const JA_FONT = "'Hiragino Kaku Gothic ProN','Hiragino Sans','Noto Sans JP',sans-serif";
const BG = "#EBEBEB";
const CARD_BG = "#f5f5f5";
const BORDER = "#d4d4d4";

// イベント名の選択肢（スプレッドシートのタブ名と完全一致）
// イベントタイトル選択肢（スプレッドシートタブ名と完全一致・順序固定）
// スプレッドシートのタブ名・メール条件分岐と完全一致させる
const EVENT_TITLE_OPTIONS = [
  "1on1 フィードバック",
  "撮影見学",
  "撮影体験",
  "レビュー会",
  "交流会",
] as const;

// 担当者マスターデータ
const STAFF_OPTIONS = [
  { name: "飯倉 孝史",  email: "iikura@kuppography.com" },
  { name: "小林 俊介",  email: "kobashun@kuppography.com" },
  { name: "佐々木 大翔", email: "hiroto@kuppography.com" },
  { name: "坂本 楓花",  email: "sakamoto@kuppography.com" },
  { name: "山口 葵",    email: "ao@kuppography.com" },
  { name: "川上 輝",    email: "h.kawakami@kuppography.com" },
] as const;

// ── 所要時間の選択肢（30分刻み、最大5時間）──────────────────
const DURATION_OPTIONS = [
  { value: 30,  label: "0.5時間" },
  { value: 60,  label: "1時間" },
  { value: 90,  label: "1.5時間" },
  { value: 120, label: "2時間" },
  { value: 150, label: "2.5時間" },
  { value: 180, label: "3時間" },
  { value: 210, label: "3.5時間" },
  { value: 240, label: "4時間" },
  { value: 270, label: "4.5時間" },
  { value: 300, label: "5時間" },
];

// ── Main wrapped with provider ────────────────────────────
export default function AdminPage() {
  return (
    <ToastProvider>
      <AdminPageInner />
    </ToastProvider>
  );
}

function AdminPageInner() {
  const { toast } = useToast();
  const [events, setEvents] = useState<EventWithSlots[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventWithSlots | null>(null);
  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadEvents(); }, []);

  async function loadEvents() {
    setLoading(true);
    const res = await fetch("/api/events");
    const json = await res.json();
    setEvents(json.data || []);
    setLoading(false);
  }

  async function handleCreateEvent(data: CreateEventData) {
    // イベント名（content_name）はタイトルと同一
    const payload = { ...data, content_name: data.title };
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) { toast(json.error, "error"); return; }
    toast("イベントを作成しました", "success");
    await loadEvents();
    setView("list");
  }

  async function handleDeleteEvent(eventId: string) {
    if (!confirm("このイベントを削除しますか？予約データも削除されます。")) return;
    const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
    if (!res.ok) { toast("削除に失敗しました", "error"); return; }
    toast("イベントを削除しました", "success");
    await loadEvents();
  }

  function openDetail(event: EventWithSlots) {
    setSelectedEvent(event);
    setView("detail");
  }

  async function refreshSelected() {
    if (!selectedEvent) return;
    const res = await fetch(`/api/events/${selectedEvent.id}`);
    const json = await res.json();
    setSelectedEvent(json.data);
    setEvents((prev) => prev.map((e) => e.id === json.data.id ? json.data : e));
  }

  return (
    <div className="min-h-screen" style={{ background: BG, fontFamily: JA_FONT }}>
      {/* Top Nav */}
      <header className="bg-[#EBEBEB] border-b sticky top-0 z-10" style={{ borderColor: BORDER }}>
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span style={{
              fontFamily: "'Helvetica Neue','Arial',sans-serif",
              fontWeight: 200,
              fontSize: "14px",
              letterSpacing: "0.18em",
              color: "#1a1a1a",
            }}>kuppography</span>
            <span className="text-xs tracking-widest text-[#8a8a8a]" style={{ fontWeight: 300, letterSpacing: "0.15em" }}>
              photo mentorship
            </span>
            {view !== "list" && (
              <>
                <ChevronRight size={13} className="text-[#bbb]" />
                <span className="text-sm text-[#333]">
                  {view === "create" ? "新規イベント" : selectedEvent?.title}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {view !== "list" && (
              <Button variant="ghost" size="sm" onClick={() => setView("list")}>← 一覧に戻る</Button>
            )}
            {view === "list" && (
              <Button size="sm" onClick={() => setView("create")}>
                <Plus size={14} /> 新規イベント
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {view === "list" && (
          <EventList events={events} loading={loading} onSelect={openDetail} onDelete={handleDeleteEvent} onRefresh={loadEvents} toast={toast} />
        )}
        {view === "create" && (
          <CreateEventForm onSubmit={handleCreateEvent} onCancel={() => setView("list")} />
        )}
        {view === "detail" && selectedEvent && (
          <EventDetail event={selectedEvent} onRefresh={refreshSelected} toast={toast} />
        )}
      </main>
    </div>
  );
}

// ── Event List ─────────────────────────────────────────────
function EventList({ events, loading, onSelect, onDelete, onRefresh, toast }: {
  events: EventWithSlots[];
  loading: boolean;
  onSelect: (e: EventWithSlots) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
  toast: (msg: string, type?: "success" | "error" | "info") => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  function copyLink(token: string) {
    const url = `${window.location.origin}/book/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    toast("リンクをコピーしました", "success");
    setTimeout(() => setCopied(null), 2000);
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: "#ddd" }} />
        ))}
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="text-center py-24 animate-fade-in">
        <Calendar size={36} className="mx-auto mb-4" style={{ color: "#bbb" }} />
        <p className="text-sm" style={{ color: "#9a9a9a" }}>まだイベントがありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium text-[#1a1a1a]">イベント一覧</h1>
        <span className="text-xs" style={{ color: "#9a9a9a" }}>{events.length} 件</span>
      </div>
      {events.map((event, i) => (
        <div
          key={event.id}
          className="rounded-xl border p-5 flex items-center gap-4 transition-all duration-150 animate-slide-up group"
          style={{ background: CARD_BG, borderColor: BORDER, animationDelay: `${i * 40}ms` }}
        >
          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelect(event)}>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm text-[#1a1a1a] truncate">{event.title}</span>
              <Badge variant={event.status === "active" ? "success" : "outline"}>
                {event.status === "active" ? "公開中" : event.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-xs" style={{ color: "#9a9a9a" }}>
              <span className="flex items-center gap-1"><Calendar size={11} />{event.slots?.length ?? 0} 候補日</span>
              <span className="flex items-center gap-1"><Users size={11} />{event.host_name}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button variant="outline" size="sm" onClick={() => copyLink(event.share_token)} className="gap-1.5">
              {copied === event.share_token ? <Check size={12} /> : <Copy size={12} />}
              {copied === event.share_token ? "コピー済" : "リンク"}
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => onSelect(event)}>
              <ExternalLink size={13} />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onDelete(event.id)}
              className="text-[#aaa] hover:text-red-500 hover:bg-red-50"
            >
              <Trash2 size={13} />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Create Event Form ──────────────────────────────────────
interface CreateEventData {
  title: string; description: string; host_name: string;
  host_email: string; duration_minutes: number;
  // content_name はタイトルと同一のため削除
}

function CreateEventForm({ onSubmit, onCancel }: {
  onSubmit: (d: CreateEventData) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<CreateEventData>({
    title: "", description: "", host_name: "", host_email: "",
    duration_minutes: 60,
  });
  const [loading, setLoading] = useState(false);

  function set(key: keyof CreateEventData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await onSubmit(form);
    setLoading(false);
  }

  const selectCls = "h-10 rounded-[8px] border px-3.5 text-[14px] text-[#1a1a1a] focus:outline-none focus:border-[#1a1a1a] focus:ring-1 focus:ring-[#1a1a1a]";
  const labelCls = "text-[13px] font-medium text-[#555]";

  return (
    <div className="max-w-2xl animate-slide-up">
      <h1 className="text-xl font-medium text-[#1a1a1a] mb-8">新規イベントを作成</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <CardBody className="space-y-4">
            {/* イベントタイトル — プルダウン */}
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>イベントタイトル *</label>
              <select value={form.title} onChange={set("title")} required
                className={selectCls} style={{ background: "#f5f5f5", borderColor: BORDER }}>
                <option value="">選択してください</option>
                {EVENT_TITLE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <Textarea label="説明" value={form.description} onChange={set("description")}
              placeholder="セッションの目的や参加者への事前案内を入力してください" rows={3} />

            {/* 所要時間 — イベント名フィールドは削除 */}
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>所要時間</label>
              <select value={form.duration_minutes} onChange={set("duration_minutes")}
                className={selectCls} style={{ background: "#f5f5f5", borderColor: BORDER }}>
                {DURATION_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><p className="text-[13px] font-medium text-[#444]">担当者情報</p></CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* 担当者プルダウン — 選択でメールアドレス自動入力 */}
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>担当者 *</label>
                <select
                  value={form.host_name}
                  onChange={(e) => {
                    const staff = STAFF_OPTIONS.find(s => s.name === e.target.value);
                    setForm(prev => ({ ...prev, host_name: e.target.value, host_email: staff?.email || "" }));
                  }}
                  required className={selectCls} style={{ background: "#f5f5f5", borderColor: BORDER }}>
                  <option value="">選択してください</option>
                  {STAFF_OPTIONS.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              {/* メールアドレス — 担当者選択で自動入力 */}
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>メールアドレス *</label>
                <input type="email" value={form.host_email} readOnly
                  className="h-10 rounded-[8px] border px-3.5 text-[14px] text-[#777] cursor-default"
                  style={{ background: "#e8e8e8", borderColor: BORDER }}
                  placeholder="担当者を選択すると自動入力" />
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" isLoading={loading} size="lg">イベントを作成</Button>
          <Button type="button" variant="ghost" onClick={onCancel}>キャンセル</Button>
        </div>
      </form>
    </div>
  );
}

// ── Event Detail ───────────────────────────────────────────
function EventDetail({ event, onRefresh, toast }: {
  event: EventWithSlots;
  onRefresh: () => void;
  toast: (msg: string, type?: "success" | "error" | "info") => void;
}) {
  const [copied, setCopied] = useState(false);
  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/book/${event.share_token}`
    : "";

  function copyLink() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast("リンクをコピーしました", "success");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-medium text-[#1a1a1a]">{event.title}</h1>
            <Badge variant={event.status === "active" ? "success" : "outline"}>
              {event.status === "active" ? "公開中" : event.status}
            </Badge>
          </div>
          <p className="text-sm" style={{ color: "#9a9a9a" }}>
            {event.host_name} · {event.duration_minutes}分
          </p>
        </div>
      </div>

      {/* 参加者共有リンク（旧: ゲスト共有リンク） */}
      <Card>
        <CardBody>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "#9a9a9a" }}>
            参加者共有リンク
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-[8px] px-4 py-2.5 text-[13px] font-mono border truncate"
              style={{ background: "#e8e8e8", borderColor: BORDER, color: "#444" }}>
              {shareUrl}
            </div>
            <Button variant="outline" onClick={copyLink} className="gap-1.5 shrink-0">
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "コピー済み" : "コピー"}
            </Button>
          </div>
        </CardBody>
      </Card>

      <SlotPicker event={event} onRefresh={onRefresh} toast={toast} />
      <BookingList event={event} onRefresh={onRefresh} toast={toast} />
    </div>
  );
}
