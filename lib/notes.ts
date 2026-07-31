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
// Each theme gets its own `bg` variant: light pastel (:root), deep translucent
// (dark), and a mid tint tuned for the terminal theme's Catppuccin surface
// (`terminal:` custom variant in globals.css). Dots stay saturated — they read
// on every surface — so they need no per-theme variant.
export const NOTE_COLORS: Record<NoteColor, { bg: string; dot: string }> = {
  amber: {
    bg: "bg-amber-100/70 dark:bg-amber-900/30 terminal:bg-amber-500/15",
    dot: "bg-amber-500",
  },
  emerald: {
    bg: "bg-emerald-100/70 dark:bg-emerald-900/30 terminal:bg-emerald-500/15",
    dot: "bg-emerald-500",
  },
  rose: {
    bg: "bg-rose-100/70 dark:bg-rose-900/30 terminal:bg-rose-500/15",
    dot: "bg-rose-500",
  },
  sky: {
    bg: "bg-sky-100/70 dark:bg-sky-900/30 terminal:bg-sky-500/15",
    dot: "bg-sky-500",
  },
  violet: {
    bg: "bg-violet-100/70 dark:bg-violet-900/30 terminal:bg-violet-500/15",
    dot: "bg-violet-500",
  },
  yellow: {
    bg: "bg-yellow-100/80 dark:bg-yellow-900/30 terminal:bg-yellow-500/15",
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

// Short absolute timestamp for created/updated labels (e.g. "Aug 2, 14:30").
export function formatNoteDate(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  })
}

const ALIGNS: readonly TextAlign[] = ["left", "center", "right", "justify"]

function isNoteColor(value: unknown): value is NoteColor {
  return typeof value === "string" && value in NOTE_COLORS
}

export const UNTITLED_BASE = "Untitled note"

// A default title guaranteed not to collide with any existing note. Empty/blank
// titles count as the base (they render as "Untitled note"), so the placeholder
// is never visually duplicated. Yields: "Untitled note", "Untitled note (1)", …
export function uniqueUntitledTitle(existing: readonly string[]): string {
  const taken = new Set(
    existing.map((t) => (t.trim() === "" ? UNTITLED_BASE : t.trim()))
  )
  if (!taken.has(UNTITLED_BASE)) return UNTITLED_BASE
  let n = 1
  while (taken.has(`${UNTITLED_BASE} (${n})`)) n++
  return `${UNTITLED_BASE} (${n})`
}

export function createNote(existingTitles: readonly string[] = []): Note {
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
    title: uniqueUntitledTitle(existingTitles),
    updatedOn: now,
  }
}

// Coerce an unknown/partial/legacy stored record into a valid Note, filling
// defaults field-by-field. Also migrates the pre-rewrite `{ body, id }` shape
// (body → html) so old notes don't crash the new colour/typography lookups.
export function normalizeNote(raw: unknown): Note {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >
  const base = createNote()
  return {
    align: ALIGNS.includes(o.align as TextAlign)
      ? (o.align as TextAlign)
      : base.align,
    color: isNoteColor(o.color) ? o.color : base.color,
    createdOn: typeof o.createdOn === "number" ? o.createdOn : base.createdOn,
    html:
      typeof o.html === "string"
        ? o.html
        : typeof o.body === "string"
          ? o.body
          : base.html,
    id: typeof o.id === "string" ? o.id : base.id,
    letterSpacing:
      typeof o.letterSpacing === "number"
        ? o.letterSpacing
        : base.letterSpacing,
    lineHeight:
      typeof o.lineHeight === "number" ? o.lineHeight : base.lineHeight,
    pinned: typeof o.pinned === "boolean" ? o.pinned : base.pinned,
    tags: Array.isArray(o.tags)
      ? o.tags.filter((t): t is string => typeof t === "string")
      : base.tags,
    title: typeof o.title === "string" ? o.title : base.title,
    updatedOn: typeof o.updatedOn === "number" ? o.updatedOn : base.updatedOn,
  }
}

export function loadNotes(): Note[] {
  if (typeof window === "undefined") return []
  try {
    const raw: unknown = JSON.parse(
      window.localStorage.getItem(NOTES_STORAGE_KEY) ?? "[]"
    )
    return Array.isArray(raw) ? raw.map(normalizeNote) : []
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
