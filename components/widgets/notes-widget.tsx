"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { Pin, Plus, Search, Trash2 } from "lucide-react"
import { AnimatePresence, LayoutGroup, motion } from "motion/react"
import { useEffect, useRef, useState } from "react"
import { DraggableWindow } from "@/components/widgets/draggable-window"
import { NoteEditorWindow } from "@/components/widgets/note-editor-window"
import { useVimInput } from "@/lib/hooks/use-vim-input"
import { SPRING_REORDER, SPRING_TAP } from "@/lib/motion"
import {
  createNote,
  formatNoteDate,
  loadNotes,
  loadOpenIds,
  NOTE_COLORS,
  type Note,
  saveNotes,
  saveOpenIds,
} from "@/lib/notes"
import { htmlToPlainText } from "@/lib/rich-text"
import { cn } from "@/lib/utils"
import { useGlobalStates } from "@/providers/global-state-provider"

export function NotesWidget(): React.JSX.Element {
  const { isNotesOpen, setIsNotesOpen, envSettings, vimMode } =
    useGlobalStates()
  const wd = envSettings.widgetDefaults.notes
  const [notes, setNotes] = useState<Note[]>(loadNotes)
  const [openIds, setOpenIds] = useState<string[]>([])
  const [query, setQuery] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)
  useVimInput(searchRef, { enabled: vimMode })

  // Restore open editor windows after mount, dropping ids with no live note.
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only restore reads notes once
  useEffect(() => {
    const live = new Set(notes.map((n) => n.id))
    setOpenIds(loadOpenIds().filter((id) => live.has(id)))
  }, [])

  const persist = (next: Note[]): void => {
    setNotes(next)
    saveNotes(next)
  }

  const updateOpen = (ids: string[]): void => {
    setOpenIds(ids)
    saveOpenIds(ids)
  }

  const openNote = (id: string): void => {
    if (!openIds.includes(id)) updateOpen([...openIds, id])
  }
  const closeNote = (id: string): void =>
    updateOpen(openIds.filter((o) => o !== id))

  const updateNote = (id: string, patch: Partial<Note>): void =>
    persist(
      notes.map((n) =>
        n.id === id ? { ...n, ...patch, updatedOn: Date.now() } : n
      )
    )

  const addNote = (): void => {
    const note = createNote(notes.map((n) => n.title))
    persist([note, ...notes])
    openNote(note.id)
  }

  const deleteNote = (id: string): void => {
    persist(notes.filter((n) => n.id !== id))
    closeNote(id)
  }

  const togglePin = (id: string): void =>
    persist(notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)))

  const pinned = notes.filter((n) => n.pinned)
  const unpinned = notes.filter((n) => !n.pinned)
  const ordered = [...pinned, ...unpinned]

  // Filter by title or tag (case-insensitive).
  const q = query.trim().toLowerCase()
  const visible =
    q === ""
      ? ordered
      : ordered.filter(
          (n) =>
            n.title.toLowerCase().includes(q) ||
            n.tags.some((t) => t.toLowerCase().includes(q))
        )

  const renderCard = (note: Note): React.JSX.Element => {
    const preview = htmlToPlainText(note.html)
    const colors = NOTE_COLORS[note.color] ?? NOTE_COLORS.yellow
    return (
      <motion.div
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "group mb-2 cursor-pointer rounded-xl border border-border/60 p-3 text-sm",
          colors.bg,
          openIds.includes(note.id) && "ring-1 ring-ring"
        )}
        exit={{ opacity: 0, scale: 0.95 }}
        initial={{ opacity: 0, scale: 0.95 }}
        key={note.id}
        layout
        layoutId={note.id}
        onClick={() => openNote(note.id)}
        transition={SPRING_REORDER}
        whileHover={{ scale: 1.01 }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <span className={cn("size-2 shrink-0 rounded-full", colors.dot)} />
            <span className="truncate font-medium">
              {note.title.trim() === "" ? "Untitled note" : note.title}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              aria-label={note.pinned ? "Unpin" : "Pin"}
              aria-pressed={note.pinned}
              className={cn(
                "rounded p-1 text-muted-foreground transition-opacity hover:text-foreground",
                note.pinned
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100"
              )}
              onClick={(e) => {
                e.stopPropagation()
                togglePin(note.id)
              }}
              type="button"
            >
              <Pin className={cn("size-3.5", note.pinned && "fill-current")} />
            </button>
            <button
              aria-label="Delete note"
              className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation()
                deleteNote(note.id)
              }}
              type="button"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
        {preview !== "" ? (
          <p className="mt-1 line-clamp-2 text-muted-foreground text-xs">
            {preview}
          </p>
        ) : null}
        {note.tags.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {note.tags.map((tag) => (
              <span
                className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                key={tag}
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        <p className="mt-1.5 text-[10px] text-muted-foreground/80">
          Created {formatNoteDate(note.createdOn)} · Edited{" "}
          {formatNoteDate(note.updatedOn)}
        </p>
      </motion.div>
    )
  }

  return (
    <>
      <DraggableWindow
        anchor={wd.anchor}
        defaultHeight={440}
        defaultOffset={wd.offset}
        defaultWidth={320}
        icon={<Pin aria-hidden className="size-3.5" />}
        isOpen={isNotesOpen}
        minHeight={240}
        minWidth={260}
        onClose={() => setIsNotesOpen(false)}
        storageKey="notes-widget"
        title="Notes"
      >
        <div className="flex h-full flex-col">
          <div className="flex flex-col gap-2 border-border border-b p-2">
            <motion.button
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground text-sm shadow-sm"
              onClick={addNote}
              transition={SPRING_TAP}
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              <Plus className="size-4" />
              New note
            </motion.button>
            <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2">
              <Search className="size-3.5 shrink-0 text-muted-foreground" />
              <input
                aria-label="Search notes"
                className="min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground"
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title or tag…"
                ref={searchRef}
                type="search"
                value={query}
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            <LayoutGroup>
              <AnimatePresence initial={false}>
                {visible.map(renderCard)}
              </AnimatePresence>
              {notes.length === 0 ? (
                <motion.p
                  animate={{ opacity: 1 }}
                  className="py-8 text-center text-muted-foreground text-sm"
                  initial={{ opacity: 0 }}
                >
                  No notes yet
                </motion.p>
              ) : visible.length === 0 ? (
                <motion.p
                  animate={{ opacity: 1 }}
                  className="py-8 text-center text-muted-foreground text-sm"
                  initial={{ opacity: 0 }}
                >
                  No matches
                </motion.p>
              ) : null}
            </LayoutGroup>
          </div>
        </div>
      </DraggableWindow>

      {/* One draggable editor window per open note */}
      {openIds.map((id, i) => {
        const note = notes.find((n) => n.id === id)
        if (!note) return null
        return (
          <NoteEditorWindow
            cascadeIndex={i}
            key={id}
            note={note}
            onChange={(patch) => updateNote(id, patch)}
            onClose={() => closeNote(id)}
          />
        )
      })}
    </>
  )
}
