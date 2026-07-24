"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { javascript } from "@codemirror/lang-javascript"
import { EditorState } from "@codemirror/state"
import { oneDark } from "@codemirror/theme-one-dark"
import { EditorView } from "@codemirror/view"
import { getCM, Vim, vim } from "@replit/codemirror-vim"
import { basicSetup } from "codemirror"
import { useEffect, useRef } from "react"

// The quit family of ex-commands routes back to the shell. `Vim.defineEx` is
// global, so register once and dispatch through a mutable handler that the active
// editor sets — command mode otherwise stays fully intact.
const QUIT_COMMANDS: readonly [name: string, prefix: string][] = [
  ["quit", "q"],
  ["qall", "qa"],
  ["wq", "wq"],
  ["xit", "x"],
  ["wqall", "wqa"],
]

let quitHandler: (() => void) | null = null
let quitRegistered = false

function ensureQuitCommands(): void {
  if (quitRegistered) return
  quitRegistered = true
  for (const [name, prefix] of QUIT_COMMANDS) {
    Vim.defineEx(name, prefix, () => quitHandler?.())
  }
}

export function CodeEditor({
  value,
  dark,
  onClose,
  onMode,
}: {
  value: string
  dark: boolean
  onClose: () => void
  onMode?: (mode: string) => void
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const onModeRef = useRef(onMode)
  onModeRef.current = onMode

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    ensureQuitCommands()
    quitHandler = () => onCloseRef.current()

    const state = EditorState.create({
      doc: value,
      extensions: [
        // vim() must precede basicSetup so its keymap wins.
        vim(),
        basicSetup,
        javascript({ jsx: true, typescript: true }),
        EditorView.theme({
          // DOM renderer resolves CSS vars, so JetBrains Mono (--font-mono)
          // applies directly; cascades to content + gutters.
          ".cm-scroller": {
            fontFamily: "var(--font-mono), ui-monospace, monospace",
            overflow: "auto",
          },
          "&": { height: "100%" },
        }),
        ...(dark ? [oneDark] : []),
      ],
    })
    const view = new EditorView({ parent: host, state })
    view.focus()

    getCM(view)?.on("vim-mode-change", (event: { mode: string }) => {
      onModeRef.current?.(event.mode)
    })

    return () => {
      quitHandler = null
      view.destroy()
    }
  }, [value, dark])

  return <div className="h-full w-full overflow-hidden" ref={hostRef} />
}
