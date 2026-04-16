// ============================================================
// Database Types (mirrors Supabase schema)
// ============================================================

export type EventStatus = "draft" | "active" | "closed";
export type BookingStatus = "pending" | "confirmed" | "cancelled";

export interface Event {
  id: string;
  title: string;
  description: string | null;
  host_name: string;
  host_email: string;
  duration_minutes: number;
  location: string | null;
  content_name: string | null; // コンテンツ名 for spreadsheet
  status: EventStatus;
  share_token: string; // unique token for guest URL
  created_at: string;
  updated_at: string;
}

export interface Slot {
  id: string;
  event_id: string;
  date: string; // ISO date "YYYY-MM-DD"
  start_time: string; // "HH:MM"
  end_time: string; // "HH:MM"
  is_available: boolean;
  created_at: string;
}

export interface Booking {
  id: string;
  event_id: string;
  slot_id: string;
  guest_name: string;
  guest_email: string;
  status: BookingStatus;
  google_event_id: string | null;
  notes: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// API Request/Response Types
// ============================================================

export interface CreateEventInput {
  title: string;
  description?: string;
  host_name: string;
  host_email: string;
  duration_minutes: number;
  location?: string;
  content_name?: string;
}

export interface CreateSlotInput {
  event_id: string;
  date: string;
  start_time: string;
  end_time: string;
}

export interface CreateBookingInput {
  slot_id: string;
  guest_name: string;
  guest_email: string;
  notes?: string;
}

export interface ConfirmBookingInput {
  booking_id: string;
}

// ============================================================
// UI/View Types (joined data for display)
// ============================================================

export interface SlotWithBooking extends Slot {
  booking?: Booking | null;
}

export interface EventWithSlots extends Event {
  slots: SlotWithBooking[];
}

export interface BookingWithDetails extends Booking {
  event: Event;
  slot: Slot;
}

// ============================================================
// API Response Wrappers
// ============================================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
}
