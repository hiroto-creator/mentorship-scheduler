-- ============================================================
-- Mentorship Scheduler — Supabase Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- EVENTS table
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL,
  description     TEXT,
  host_name       TEXT NOT NULL,
  host_email      TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  location        TEXT,
  content_name    TEXT,                          -- コンテンツ名 for spreadsheet
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('draft', 'active', 'closed')),
  share_token     TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SLOTS table (candidate date/time options)
-- ============================================================
CREATE TABLE IF NOT EXISTS slots (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS slots_event_id_idx ON slots(event_id);
CREATE INDEX IF NOT EXISTS slots_date_idx ON slots(date);

-- ============================================================
-- BOOKINGS table
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  slot_id         UUID NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
  guest_name      TEXT NOT NULL,
  guest_email     TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  google_event_id TEXT,                        -- Google Calendar event ID
  notes           TEXT,
  confirmed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bookings_event_id_idx ON bookings(event_id);
CREATE INDEX IF NOT EXISTS bookings_slot_id_idx ON bookings(slot_id);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings(status);

-- ============================================================
-- updated_at auto-trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
ALTER TABLE events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE slots    ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Public: read active events by share_token
CREATE POLICY "read_active_events" ON events
  FOR SELECT USING (status = 'active');

-- Public: read slots for active events
CREATE POLICY "read_slots" ON slots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events e WHERE e.id = slots.event_id AND e.status = 'active'
    )
  );

-- Public: create bookings (guests can book)
CREATE POLICY "create_bookings" ON bookings
  FOR INSERT WITH CHECK (true);

-- Public: read own booking by email
CREATE POLICY "read_own_bookings" ON bookings
  FOR SELECT USING (true);  -- restrict further with auth if needed

-- Service role has full access (backend API)
-- No extra policies needed — service role bypasses RLS

-- ============================================================
-- Migration: Add chosen_start_time, chosen_end_time, meet_link
-- Run this if you already created the tables above
-- ============================================================
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS chosen_start_time TIME,
  ADD COLUMN IF NOT EXISTS chosen_end_time   TIME,
  ADD COLUMN IF NOT EXISTS meet_link         TEXT;

-- ============================================================
-- Migration v3: slots に担当者カラムを追加
-- ============================================================
ALTER TABLE slots
  ADD COLUMN IF NOT EXISTS assignee_name  TEXT,
  ADD COLUMN IF NOT EXISTS assignee_email TEXT;

-- ============================================================
-- Migration v3: slots に担当者カラムを追加（Supabase SQL Editorで実行）
-- ============================================================
ALTER TABLE slots
  ADD COLUMN IF NOT EXISTS assignee_name  TEXT,
  ADD COLUMN IF NOT EXISTS assignee_email TEXT;

-- ============================================================
-- Migration v4: 複数候補日時対応
-- ============================================================
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS candidate_slots      JSONB,
  ADD COLUMN IF NOT EXISTS confirmed_start_time TIME,
  ADD COLUMN IF NOT EXISTS confirmed_end_time   TIME;

-- candidate_slots の構造例:
-- [
--   {"slot_id":"uuid","date":"2026-05-01","start":"10:00","end":"11:00"},
--   {"slot_id":"uuid","date":"2026-05-02","start":"14:00","end":"15:00"}
-- ]

-- ============================================================
-- Migration v4: bookings に複数候補・確定時刻カラムを追加
-- ============================================================
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS candidate_slots      JSONB,
  ADD COLUMN IF NOT EXISTS confirmed_start_time TIME,
  ADD COLUMN IF NOT EXISTS confirmed_end_time   TIME;

-- ============================================================
-- Migration v4: 複数候補日時 + 確定日時カラム
-- ============================================================
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS candidate_slots      JSONB,
  ADD COLUMN IF NOT EXISTS confirmed_start_time TIME,
  ADD COLUMN IF NOT EXISTS confirmed_end_time   TIME;

-- ============================================================
-- Migration v4: bookings に confirmed_slots (JSONB) を追加
-- ============================================================
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS confirmed_slots JSONB;
-- 構造例:
-- [
--   {
--     "slot_id": "uuid",
--     "date": "2026-05-01",
--     "start_time": "10:00",
--     "end_time": "11:00",
--     "assignee_name": "佐々木 大翔",
--     "google_event_id": "xxx",
--     "meet_link": "https://meet.google.com/xxx"
--   }
-- ]

-- chosen_slots も追加（ゲストが希望した複数スロット）
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS chosen_slots JSONB;
