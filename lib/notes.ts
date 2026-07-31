// Single source of truth for the notes model + persistence. Rich content is a
// sanitized HTML string; document-level typography (align/line/letter) and
// metadata (title/tags/color/pin/timestamps) live alongside it.

import type { TextAlign } from "@/lib/rich-text"

export type NoteColor =
  | "yellow"
  | "rose"
  | "amber"
  | "emerald"
  | "sky"
  | "violet"

// bg = card/window tint · dot = the colour pip in pickers and list rows.
export const NOTE_COLORS: Record<NoteColor, { bg: string; dot: string }> = {
  amber: { bg: "bg-amber-100/70 dark:bg-amber-900/30", dot: "bg-amber-500" },
  emerald: {
    bg: "bg-emerald-100/70 dark:bg-emerald-900/30",
    dot: "bg-emerald-500",
  },
  rose: { bg: "bg-rose-100/70 dark:bg-rose-900/30", dot: "bg-rose-500" },
  sky: { bg: "bg-sky-100/70 dark:bg-sky-900/30", dot: "bg-sky-500" },
  violet: {
    bg: "bg-violet-100/70 dark:bg-violet-900/30",
    dot: "bg-violet-500",
  },
  yellow: {
    bg: "bg-yellow-100/80 dark:bg-yellow-900/30",
    dot: "bg-yellow-400",
  },
}

export const NOTE_COLOR_KEYS = Object.keys(NOTE_COLORS) as NoteColor[]

export type Note = {
  id: string
  title: string
  html: string
  color: NoteColor
  tags: string[]
  pinned: boolean
  align: TextAlign
  lineHeight: number
  letterSpacing: number
  createdOn: number // epoch ms
  updatedOn: number // epoch ms
}

export const NOTES_STORAGE_KEY = "kangaflow:notes"
export const NOTES_OPEN_STORAGE_KEY = "kangaflow:notes-open"

export function createNote(): Note {
  const now = Date.now()
  return {
    align: "left",
    color: "yellow",
    createdOn: now,
    html: "",
    id: crypto.randomUUID(),
    letterSpacing: 0,
    lineHeight: 1.5,
    pinned: false,
    tags: [],
    title: "",
    updatedOn: now,
  }
}

export function loadNotes(): Note[] {
  if (typeof window === "undefined") return []
  try {
    const raw: unknown = JSON.parse(
      window.localStorage.getItem(NOTES_STORAGE_KEY) ?? "[]"
    )
    return Array.isArray(raw) ? (raw as Note[]) : []
  } catch {
    return []
  }
}

export function saveNotes(notes: Note[]): void {
  window.localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes))
}

// Persisted set of note ids whose editor windows are open (so they reopen after
// a reload). Filtered against live notes on load to drop stale ids.
export function loadOpenIds(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw: unknown = JSON.parse(
      window.localStorage.getItem(NOTES_OPEN_STORAGE_KEY) ?? "[]"
    )
    return Array.isArray(raw) ? (raw as string[]) : []
  } catch {
    return []
  }
}

export function saveOpenIds(ids: string[]): void {
  window.localStorage.setItem(NOTES_OPEN_STORAGE_KEY, JSON.stringify(ids))
}
