"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { NotebookPen, Plus, Trash2 } from "lucide-react"
import { AnimatePresence, LayoutGroup, motion } from "motion/react"
import { useRef, useState } from "react"
import { DraggableWindow } from "@/components/widgets/draggable-window"
import { cn } from "@/lib/utils"
import { useGlobalStates } from "@/providers/global-state-provider"

const STORAGE_KEY = "kangaflow:notes"

// TODO(human): Define the Note type and NOTE_COLORS palette below.
// Decide: what fields does a note have (id, body, color, createdAt)?
// What are the valid color options and their Tailwind bg classes?
// Example shape to get you started — change as you see fit:
//
// type NoteColor = "yellow" | "pink" | ...
// type Note = { id: string; body: string; color: NoteColor; createdAt: number }
// const NOTE_COLORS: Record<NoteColor, string> = { yellow: "bg-yellow-200/80 dark:bg-yellow-800/60", ... }

function loadNotes<T>(): T[] {
  if (typeof window === "undefined") return []
  try {
    const raw: unknown = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "[]"
    )
    return Array.isArray(raw) ? (raw as T[]) : []
  } catch {
    return []
  }
}

export function NotesWidget(): React.JSX.Element {
  const { isNotesOpen, setIsNotesOpen } = useGlobalStates()

  // TODO(human): Replace `unknown` with your Note type once defined above,
  // and wire the color selector into addNote / the card render below.
  const [notes, setNotes] = useState<unknown[]>(() => loadNotes())
  const [draft, setDraft] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const saveNotes = (next: unknown[]): void => {
    setNotes(next)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const addNote = (): void => {
    if (!draft.trim()) return
    // TODO(human): fill in id, color, and createdAt using your Note type.
    saveNotes([{ body: draft.trim(), id: crypto.randomUUID() }, ...notes])
    setDraft("")
    textareaRef.current?.focus()
  }

  const deleteNote = (id: string): void =>
    saveNotes((notes as Array<{ id: string }>).filter((n) => n.id !== id))

  return (
    <DraggableWindow
      defaultHeight={420}
      defaultWidth={320}
      icon={<NotebookPen aria-hidden className="size-3.5" />}
      isOpen={isNotesOpen}
      minHeight={220}
      minWidth={240}
      onClose={() => setIsNotesOpen(false)}
      positionClassName="top-4 left-4"
      storageKey="notes-widget"
      title="Notes"
    >
      <div className="flex h-full flex-col gap-0">
        {/* Draft area */}
        <div className="flex gap-2 border-border border-b p-3">
          <textarea
            className="min-h-[4rem] flex-1 resize-none rounded-md border border-border bg-muted/40 px-2 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addNote()
            }}
            placeholder="New note… (⌘↵ to save)"
            ref={textareaRef}
            value={draft}
          />
          <motion.button
            aria-label="Add note"
            className="self-end rounded-md bg-primary p-2 text-primary-foreground shadow-sm"
            onClick={addNote}
            transition={{ damping: 18, stiffness: 500, type: "spring" }}
            type="button"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.88 }}
          >
            <Plus className="size-4" />
          </motion.button>
        </div>

        {/* Note cards */}
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <LayoutGroup>
            <AnimatePresence initial={false}>
              {(notes as Array<{ id: string; body: string }>).map((note) => (
                <motion.div
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className={cn(
                    "group mb-2 rounded-xl border border-border/60 bg-yellow-100/80 p-3 text-sm dark:bg-yellow-900/30"
                    // TODO(human): swap the hardcoded yellow class with NOTE_COLORS[note.color]
                  )}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  key={note.id}
                  layout
                  transition={{ damping: 22, stiffness: 340, type: "spring" }}
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="flex-1 whitespace-pre-wrap break-words leading-relaxed">
                      {note.body}
                    </p>
                    <motion.button
                      aria-label="Delete note"
                      className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-colors hover:text-destructive group-hover:opacity-100"
                      onClick={() => deleteNote(note.id)}
                      transition={{
                        damping: 18,
                        stiffness: 500,
                        type: "spring",
                      }}
                      type="button"
                      whileTap={{ scale: 0.85 }}
                    >
                      <Trash2 className="size-3.5" />
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {notes.length === 0 ? (
              <motion.p
                animate={{ opacity: 1 }}
                className="py-8 text-center text-muted-foreground text-sm"
                initial={{ opacity: 0 }}
                transition={{ delay: 0.1 }}
              >
                No notes yet
              </motion.p>
            ) : null}
          </LayoutGroup>
        </div>
      </div>
    </DraggableWindow>
  )
}
