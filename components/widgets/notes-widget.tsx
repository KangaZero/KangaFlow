"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { Pin, Plus, Search, Trash2 } from "lucide-react"
import { AnimatePresence, LayoutGroup, motion } from "motion/react"
import { useEffect, useRef, useState } from "react"
import { DraggableWindow } from "@/components/widgets/draggable-window"
import { NoteEditorWindow } from "@/components/widgets/note-editor-window"
import { useVimInput } from "@/lib/hooks/use-vim-input"
import { interpolate } from "@/lib/i18n"
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
import { useLocale } from "@/providers/locale-provider"

export function NotesWidget(): React.JSX.Element {
  const { isNotesOpen, setIsNotesOpen, envSettings, vimMode } =
    useGlobalStates()
  const { locale, translate } = useLocale()
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
          "group border-border/60 mb-2 cursor-pointer rounded-xl border p-3 text-sm transition-shadow hover:shadow-[0_8px_18px_-10px_rgba(0,0,0,0.45)]",
          colors.bg,
          openIds.includes(note.id) && "ring-ring ring-1"
        )}
        data-env-part="note-card"
        data-pinned={note.pinned}
        exit={{ opacity: 0, scale: 0.95 }}
        initial={{ opacity: 0, scale: 0.95 }}
        key={note.id}
        layout
        layoutId={note.id}
        onClick={() => openNote(note.id)}
        style={{ "--note-c": colors.accent }}
        transition={SPRING_REORDER}
        whileHover={{ y: -2 }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <span className={cn("size-2 shrink-0 rounded-full", colors.dot)} />
            <span className="truncate font-medium" data-env-part="note-title">
              {note.title.trim() === ""
                ? translate("widgets.notes.untitled")
                : note.title}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              aria-label={translate(
                note.pinned ? "widgets.notes.unpin" : "widgets.notes.pin"
              )}
              aria-pressed={note.pinned}
              className={cn(
                "text-muted-foreground hover:text-foreground rounded p-1 transition-opacity",
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
              aria-label={translate("widgets.notes.delete")}
              className="text-muted-foreground hover:text-destructive rounded p-1 opacity-0 transition-opacity group-hover:opacity-100"
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
          // foreground/80, not muted: muted on the tinted card fell under AA
          // (4.4:1) in the light theme.
          <p className="text-foreground/80 mt-1 line-clamp-2 text-xs">
            {preview}
          </p>
        ) : null}
        {note.tags.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {note.tags.map((tag) => (
              <span
                className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px]"
                data-env-part="note-tag"
                key={tag}
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        <p
          className="text-muted-foreground/80 mt-1.5 text-[10px]"
          data-env-part="note-meta"
        >
          {interpolate(translate("widgets.notes.created"), {
            date: formatNoteDate(note.createdOn, locale),
          })}
          {" · "}
          {interpolate(translate("widgets.notes.edited"), {
            date: formatNoteDate(note.updatedOn, locale),
          })}
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
        title={translate("widgets.notes.title")}
      >
        <div className="flex h-full flex-col">
          <div className="border-border flex flex-col gap-2 border-b p-2">
            <motion.button
              className="bg-primary text-primary-foreground flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium shadow-sm"
              data-env-part="key-primary flat"
              onClick={addNote}
              transition={SPRING_TAP}
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              <Plus className="size-4" />
              {translate("widgets.notes.newNote")}
            </motion.button>
            <div
              className="border-border bg-muted/40 flex items-center gap-1.5 rounded-md border px-2"
              data-env-part="field"
            >
              <Search className="text-muted-foreground size-3.5 shrink-0" />
              <input
                aria-label={translate("widgets.notes.search")}
                className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none"
                onChange={(e) => setQuery(e.target.value)}
                placeholder={translate("widgets.notes.searchPlaceholder")}
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
                  className="text-muted-foreground py-8 text-center text-sm"
                  data-env-part="empty"
                  initial={{ opacity: 0 }}
                >
                  {translate("widgets.notes.empty")}
                </motion.p>
              ) : visible.length === 0 ? (
                <motion.p
                  animate={{ opacity: 1 }}
                  className="text-muted-foreground py-8 text-center text-sm"
                  data-env-part="empty"
                  initial={{ opacity: 0 }}
                >
                  {translate("widgets.notes.noMatches")}
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
