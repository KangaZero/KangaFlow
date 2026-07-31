"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { NotebookPen, X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { DraggableWindow } from "@/components/widgets/draggable-window"
import { RichTextEditor } from "@/components/widgets/rich-text-editor"
import {
  formatNoteDate,
  NOTE_COLOR_KEYS,
  NOTE_COLORS,
  type Note,
} from "@/lib/notes"
import type { TextAlign } from "@/lib/rich-text"
import { cn } from "@/lib/utils"

const TAP_SPRING = { damping: 18, stiffness: 500, type: "spring" } as const

// A few cascading anchors so freshly-opened editor windows don't stack exactly.
const CASCADE = [
  "top-6 left-6",
  "top-14 left-16",
  "top-24 left-28",
  "top-10 right-10",
  "top-20 right-24",
] as const

export function NoteEditorWindow({
  cascadeIndex,
  note,
  onChange,
  onClose,
}: {
  note: Note
  cascadeIndex: number
  onChange: (patch: Partial<Note>) => void
  onClose: () => void
}): React.JSX.Element {
  const [tagDraft, setTagDraft] = useState("")

  const addTag = (): void => {
    const tag = tagDraft.trim()
    if (tag === "" || note.tags.includes(tag)) {
      setTagDraft("")
      return
    }
    onChange({ tags: [...note.tags, tag] })
    setTagDraft("")
  }

  const removeTag = (tag: string): void =>
    onChange({ tags: note.tags.filter((t) => t !== tag) })

  return (
    <DraggableWindow
      defaultHeight={420}
      defaultWidth={420}
      icon={<NotebookPen aria-hidden className="size-3.5" />}
      isOpen={true}
      minHeight={300}
      minWidth={320}
      onClose={onClose}
      positionClassName={CASCADE[cascadeIndex % CASCADE.length] ?? CASCADE[0]}
      storageKey={`note-${note.id}`}
      title={note.title.trim() === "" ? "Untitled note" : note.title}
    >
      <div className="flex h-full min-h-0 flex-col">
        {/* Title */}
        <input
          className="shrink-0 border-border border-b bg-transparent px-3 py-2 font-semibold text-sm outline-none placeholder:text-muted-foreground"
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Title"
          value={note.title}
        />

        {/* Rich-text editor (toolbar + contentEditable) */}
        <RichTextEditor
          align={note.align}
          initialHtml={note.html}
          letterSpacing={note.letterSpacing}
          lineHeight={note.lineHeight}
          onAlignChange={(align: TextAlign) => onChange({ align })}
          onHtmlChange={(html) => onChange({ html })}
          onLetterSpacingChange={(letterSpacing) => onChange({ letterSpacing })}
          onLineHeightChange={(lineHeight) => onChange({ lineHeight })}
        />

        {/* Footer: colours, tags, timestamp */}
        <div className="flex shrink-0 flex-col gap-2 border-border border-t p-2">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {NOTE_COLOR_KEYS.map((c) => (
                <motion.button
                  aria-label={`Colour ${c}`}
                  aria-pressed={note.color === c}
                  className={cn(
                    "size-4 rounded-full",
                    NOTE_COLORS[c].dot,
                    note.color === c && "ring-2 ring-ring ring-offset-1"
                  )}
                  key={c}
                  onClick={() => onChange({ color: c })}
                  transition={TAP_SPRING}
                  type="button"
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.85 }}
                />
              ))}
            </div>
            <span className="ml-auto text-[10px] text-muted-foreground">
              Created {formatNoteDate(note.createdOn)} · Edited{" "}
              {formatNoteDate(note.updatedOn)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            <AnimatePresence initial={false}>
              {note.tags.map((tag) => (
                <motion.span
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  key={tag}
                  transition={TAP_SPRING}
                >
                  <Badge className="gap-1" variant="secondary">
                    {tag}
                    <button
                      aria-label={`Remove ${tag}`}
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeTag(tag)}
                      type="button"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                </motion.span>
              ))}
            </AnimatePresence>
            <input
              className="min-w-16 flex-1 bg-transparent px-1 py-0.5 text-xs outline-none placeholder:text-muted-foreground"
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addTag()
                if (
                  e.key === "Backspace" &&
                  tagDraft === "" &&
                  note.tags.length
                )
                  removeTag(note.tags[note.tags.length - 1] ?? "")
              }}
              placeholder="Add tag…"
              value={tagDraft}
            />
          </div>
        </div>
      </div>
    </DraggableWindow>
  )
}
