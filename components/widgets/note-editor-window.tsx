"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { NotebookPen, X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { DraggableWindow } from "@/components/widgets/draggable-window"
import { RichTextEditor } from "@/components/widgets/rich-text-editor"
import { useVimInput } from "@/lib/hooks/use-vim-input"
import { interpolate } from "@/lib/i18n"
import { isCommitEnter } from "@/lib/keyboard-events"
import { SPRING_TAP } from "@/lib/motion"
import {
  formatNoteDate,
  NOTE_COLOR_KEYS,
  NOTE_COLORS,
  type Note,
} from "@/lib/notes"
import type { TextAlign } from "@/lib/rich-text"
import { cn } from "@/lib/utils"
import { useGlobalStates } from "@/providers/global-state-provider"
import { useLocale } from "@/providers/locale-provider"

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
  const { vimMode } = useGlobalStates()
  const { locale, translate } = useLocale()
  const titleRef = useRef<HTMLInputElement>(null)
  const tagRef = useRef<HTMLInputElement>(null)
  useVimInput(titleRef, { enabled: vimMode })
  useVimInput(tagRef, { enabled: vimMode })

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
      title={
        note.title.trim() === ""
          ? translate("widgets.notes.untitled")
          : note.title
      }
    >
      <div className="flex h-full min-h-0 flex-col">
        {/* Title */}
        <input
          className="border-border placeholder:text-muted-foreground shrink-0 border-b bg-transparent px-3 py-2 text-sm font-semibold outline-none"
          data-env-part="note-ed-title"
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder={translate("widgets.notes.titlePlaceholder")}
          ref={titleRef}
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
        <div className="border-border flex shrink-0 flex-col gap-2 border-t p-2">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {NOTE_COLOR_KEYS.map((c) => (
                <motion.button
                  aria-label={interpolate(translate("widgets.colorOption"), {
                    color: translate(`widgets.colors.${c}`),
                  })}
                  aria-pressed={note.color === c}
                  className={cn(
                    "size-4 rounded-full",
                    NOTE_COLORS[c].dot,
                    note.color === c && "ring-ring ring-2 ring-offset-1"
                  )}
                  key={c}
                  onClick={() => onChange({ color: c })}
                  transition={SPRING_TAP}
                  type="button"
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.85 }}
                />
              ))}
            </div>
            <div className="flex w-full flex-col justify-end">
              <span className="text-muted-foreground ml-auto text-[10px]">
                {interpolate(translate("widgets.notes.created"), {
                  date: formatNoteDate(note.createdOn, locale),
                })}
              </span>
              <span className="text-muted-foreground ml-auto text-[10px]">
                {interpolate(translate("widgets.notes.edited"), {
                  date: formatNoteDate(note.updatedOn, locale),
                })}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            <AnimatePresence initial={false}>
              {note.tags.map((tag) => (
                <motion.span
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  key={tag}
                  transition={SPRING_TAP}
                >
                  <Badge className="gap-1" variant="secondary">
                    {tag}
                    <button
                      aria-label={interpolate(
                        translate("widgets.notes.removeTag"),
                        {
                          tag,
                        }
                      )}
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
              className="placeholder:text-muted-foreground min-w-16 flex-1 bg-transparent px-1 py-0.5 text-xs outline-none"
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (isCommitEnter(e.nativeEvent)) addTag()
                if (
                  e.key === "Backspace" &&
                  tagDraft === "" &&
                  note.tags.length
                )
                  removeTag(note.tags[note.tags.length - 1] ?? "")
              }}
              placeholder={translate("widgets.notes.addTag")}
              ref={tagRef}
              value={tagDraft}
            />
          </div>
        </div>
      </div>
    </DraggableWindow>
  )
}
