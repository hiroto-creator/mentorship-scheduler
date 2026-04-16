// スプレッドシートのタブ名と完全一致させる必要があるイベント名
export const EVENT_NAME_OPTIONS = [
  "1on1 フィードバック",
  "撮影見学",
  "撮影体験",
  "レビュー会",
  "交流会",
] as const;

export type EventName = typeof EVENT_NAME_OPTIONS[number];

// 担当者をメールに表示するイベント名（Phase 4）
export const EVENTS_WITH_ASSIGNEE: string[] = [
  "1on1 フィードバック",
  "撮影見学",
  "撮影体験",
];

// Google Calendar: PatternAイベント（担当者カレンダーに登録）
export const PATTERN_A_EVENTS: string[] = [
  "1on1 フィードバック",
  "撮影見学",
  "撮影体験",
];
