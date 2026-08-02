"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  type LucideIcon,
  MoveHorizontal,
  MoveVertical,
  Strikethrough,
  Type,
  Underline,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Slider } from "@/components/ui/slider"
import { useCaretPosition } from "@/lib/hooks/use-caret-position"
import { useLineNumbers } from "@/lib/hooks/use-line-numbers"
import { useVimContentEditable } from "@/lib/hooks/use-vim-content-editable"
import {
  applyRawHtml,
  DEFAULT_FONT_SIZE,
  FONT_SIZES,
  formatHtml,
  type InlineFormatState,
  readState,
  sanitizeHtml,
  setFontSize,
  type TextAlign,
  toggleBold,
  toggleDecoration,
} from "@/lib/rich-text"
import { cn } from "@/lib/utils"
import { useGlobalStates } from "@/providers/global-state-provider"

const EMPTY_STATE: InlineFormatState = {
  bold: false,
  fontSize: null,
  strike: false,
  underline: false,
}

const ALIGNMENTS: readonly { icon: LucideIcon; value: TextAlign }[] = [
  { icon: AlignLeft, value: "left" },
  { icon: AlignCenter, value: "center" },
  { icon: AlignRight, value: "right" },
  { icon: AlignJustify, value: "justify" },
]

// A ghost toggle button that keeps the editor selection alive: pressing it
// preventDefaults mousedown so focus/selection never leaves the contentEditable.
function ToolbarToggle({
  active,
  icon: Icon,
  label,
  onToggle,
}: {
  active: boolean
  icon: LucideIcon
  label: string
  onToggle: () => void
}): React.JSX.Element {
  return (
    <Button
      aria-label={label}
      aria-pressed={active}
      className={cn(active && "bg-muted text-foreground")}
      onMouseDown={(e) => {
        e.preventDefault()
        onToggle()
      }}
      size="icon-sm"
      type="button"
      variant="ghost"
    >
      <Icon />
    </Button>
  )
}

export type RichTextEditorProps = {
  initialHtml: string
  align: TextAlign
  lineHeight: number
  letterSpacing: number
  onHtmlChange: (html: string) => void
  onAlignChange: (align: TextAlign) => void
  onLineHeightChange: (value: number) => void
  onLetterSpacingChange: (value: number) => void
}

export function RichTextEditor({
  align,
  initialHtml,
  letterSpacing,
  lineHeight,
  onAlignChange,
  onHtmlChange,
  onLetterSpacingChange,
  onLineHeightChange,
}: RichTextEditorProps): React.JSX.Element {
  const editorRef = useRef<HTMLDivElement>(null)
  const [fmt, setFmt] = useState<InlineFormatState>(EMPTY_STATE)
  // Raw-HTML view: shows the editor's actual markup in a plain textarea. The
  // contentEditable stays mounted (hidden) so the vim/gutter listeners survive.
  const [showRaw, setShowRaw] = useState(false)
  const [rawHtml, setRawHtml] = useState("")
  // Caret line/column for the vim-style ruler (foundation for line-aware vim).
  const caret = useCaretPosition(editorRef)
  // Modal (vim) editing over the contentEditable when the global toggle is on.
  const { vimMode, noteLineNumbers } = useGlobalStates()
  useVimContentEditable(editorRef, { enabled: vimMode })
  // Vim-style line-number gutter (off / absolute / relative).
  const { lines: gutterLines, scrollTop } = useLineNumbers(
    editorRef,
    noteLineNumbers,
    caret?.row ?? 1
  )

  // Seed the contentEditable once (keyed by note id upstream, so a remount loads
  // the right note). Never re-inject on render — React children would fight the
  // caret; the DOM is the source of truth for content after mount.
  // biome-ignore lint/correctness/useExhaustiveDependencies: initial content only
  useEffect(() => {
    if (editorRef.current)
      editorRef.current.innerHTML = sanitizeHtml(initialHtml)
  }, [])

  const refreshState = useCallback(() => {
    if (editorRef.current) setFmt(readState(editorRef.current))
  }, [])

  // Keep the toolbar in sync while selecting inside this editor.
  useEffect(() => {
    const onSelectionChange = (): void => {
      const root = editorRef.current
      const sel = window.getSelection()
      if (!root || !sel || sel.rangeCount === 0) return
      if (root.contains(sel.getRangeAt(0).commonAncestorContainer)) {
        refreshState()
      }
    }
    document.addEventListener("selectionchange", onSelectionChange)
    return () =>
      document.removeEventListener("selectionchange", onSelectionChange)
  }, [refreshState])

  const emitHtml = useCallback(() => {
    if (editorRef.current) onHtmlChange(editorRef.current.innerHTML)
  }, [onHtmlChange])

  // Toggle raw ⇄ rendered. Entering raw snapshots the live innerHTML; leaving
  // applies the (possibly edited) markup back into the still-mounted editor.
  const toggleRaw = useCallback(() => {
    const root = editorRef.current
    if (!root) return
    if (showRaw) {
      applyRawHtml(root, rawHtml) // apply edits, stripping indentation whitespace
      emitHtml()
      setShowRaw(false)
    } else {
      setRawHtml(formatHtml(root.innerHTML)) // pretty-print for reading
      setShowRaw(true)
    }
  }, [showRaw, rawHtml, emitHtml])

  // Run an engine command, then push the new html + refresh the toolbar.
  const run = useCallback(
    (fn: (root: HTMLElement) => void) => {
      const root = editorRef.current
      if (!root) return
      fn(root)
      emitHtml()
      refreshState()
    },
    [emitHtml, refreshState]
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-border border-b p-1.5">
        <ToolbarToggle
          active={fmt.bold}
          icon={Bold}
          label="Bold"
          onToggle={() => run(toggleBold)}
        />
        <ToolbarToggle
          active={fmt.underline}
          icon={Underline}
          label="Underline"
          onToggle={() => run((r) => toggleDecoration(r, "underline"))}
        />
        <ToolbarToggle
          active={fmt.strike}
          icon={Strikethrough}
          label="Strikethrough"
          onToggle={() => run((r) => toggleDecoration(r, "line-through"))}
        />

        {/* Font size */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label="Font size"
              className="gap-1"
              size="sm"
              type="button"
              variant="ghost"
            >
              <Type />
              {fmt.fontSize ?? DEFAULT_FONT_SIZE}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuRadioGroup
              onValueChange={(v) => run((r) => setFontSize(r, Number(v)))}
              value={String(fmt.fontSize ?? DEFAULT_FONT_SIZE)}
            >
              {FONT_SIZES.map((size) => (
                <DropdownMenuRadioItem key={size} value={String(size)}>
                  {size}px
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="mx-0.5 h-4 w-px bg-border" />

        {/* Alignment (document-level) */}
        {ALIGNMENTS.map(({ icon: Icon, value }) => (
          <Button
            aria-label={`Align ${value}`}
            aria-pressed={align === value}
            className={cn(align === value && "bg-muted text-foreground")}
            key={value}
            onMouseDown={(e) => {
              e.preventDefault()
              onAlignChange(value)
            }}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <Icon />
          </Button>
        ))}

        <span className="mx-0.5 h-4 w-px bg-border" />

        {/* Spacing (document-level: line + letter) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label="Spacing"
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <MoveVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 p-3">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                  <MoveVertical className="size-3.5" />
                  Line height
                  <span className="ml-auto font-mono tabular-nums">
                    {lineHeight.toFixed(1)}
                  </span>
                </span>
                <Slider
                  max={2.5}
                  min={1}
                  onValueChange={(v) => onLineHeightChange(v[0] ?? 1.5)}
                  step={0.1}
                  value={[lineHeight]}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                  <MoveHorizontal className="size-3.5" />
                  Letter spacing
                  <span className="ml-auto font-mono tabular-nums">
                    {letterSpacing.toFixed(1)}
                  </span>
                </span>
                <Slider
                  max={4}
                  min={-1}
                  onValueChange={(v) => onLetterSpacingChange(v[0] ?? 0)}
                  step={0.5}
                  value={[letterSpacing]}
                />
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="mx-0.5 h-4 w-px bg-border" />

        {/* Raw HTML view toggle */}
        <ToolbarToggle
          active={showRaw}
          icon={Code2}
          label="Raw HTML"
          onToggle={toggleRaw}
        />
      </div>

      {/* Editable surface (+ optional line-number gutter overlay). The
          contentEditable stays mounted (hidden in raw mode) so its listeners
          survive; the raw <textarea> overlays it. */}
      <div className={cn("relative flex min-h-0 flex-1", showRaw && "hidden")}>
        {noteLineNumbers !== "off" ? (
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 overflow-hidden border-border/40 border-r bg-muted/10 font-mono text-[0.7rem] text-muted-foreground tabular-nums">
            <div style={{ transform: `translateY(${-scrollTop}px)` }}>
              {gutterLines.map((line, i) => (
                <span
                  className="absolute right-1.5"
                  // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional
                  key={i}
                  style={{ top: line.top }}
                >
                  {line.num}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        {/* biome-ignore lint/a11y/useFocusableInteractive: contentEditable is inherently focusable */}
        {/* biome-ignore lint/a11y/useSemanticElements: a rich-text contentEditable cannot be an <input>/<textarea> */}
        <div
          aria-label="Note content"
          aria-multiline="true"
          className={cn(
            "min-h-0 flex-1 overflow-auto p-3 text-sm leading-relaxed outline-none [&_a]:text-primary [&_a]:underline",
            noteLineNumbers !== "off" && "pl-11"
          )}
          contentEditable
          onInput={emitHtml}
          ref={editorRef}
          role="textbox"
          style={{
            fontSize: DEFAULT_FONT_SIZE,
            letterSpacing: `${letterSpacing}px`,
            lineHeight,
            textAlign: align,
          }}
          suppressContentEditableWarning
        />
      </div>

      {/* Raw HTML editor (shown instead of the rendered surface), fading in. */}
      {showRaw ? (
        <textarea
          aria-label="Raw note HTML"
          className="fade-in min-h-0 flex-1 animate-in resize-none overflow-auto bg-muted/10 p-3 font-mono text-muted-foreground text-xs outline-none duration-50"
          onChange={(e) => setRawHtml(e.target.value)}
          spellCheck={false}
          value={rawHtml}
        />
      ) : null}

      {/* Vim-style ruler: line,column · total lines. Numeric, so no i18n label
          needed (matches vim's bottom-right ruler). */}
      <div className="flex justify-end border-border border-t px-3 py-1 font-mono text-muted-foreground text-xs tabular-nums">
        {caret ? `${caret.row},${caret.col}` : "1,1"}
        <span className="ml-2 opacity-60">
          {caret ? `${caret.lines}L` : "1L"}
        </span>
      </div>
    </div>
  )
}
