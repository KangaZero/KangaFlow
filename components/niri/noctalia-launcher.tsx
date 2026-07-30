"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import {
  FileCode2,
  Globe,
  type LucideIcon,
  SquareTerminal,
  User,
} from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useMemo, useRef, useState } from "react"
import type { BorderRadius } from "@/components/niri/settings"
import type { AppId } from "@/components/niri/types"
import { cn } from "@/lib/utils"
import { useLocale } from "@/providers/locale-provider"

export type LauncherApp = { id: AppId; name: string; subtitle: string }

// One source of truth for each app's glyph — keyed by the `AppId` union so
// adding a new app surfaces a missing-key type error here.
const APP_ICONS: Record<AppId, LucideIcon> = {
  about: User,
  browser: Globe,
  editor: FileCode2,
  terminal: SquareTerminal,
}

export function NoctaliaLauncher(props: {
  open: boolean
  apps: LauncherApp[]
  onLaunch: (id: AppId) => void
  onClose: () => void
  launcherRadius: BorderRadius
}): React.JSX.Element | null {
  const { open, apps, onLaunch, onClose, launcherRadius } = props
  const { translate } = useLocale()
  const [query, setQuery] = useState("")
  const [highlight, setHighlight] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (needle === "") return apps
    return apps.filter(
      (app) =>
        app.name.toLowerCase().includes(needle) ||
        app.subtitle.toLowerCase().includes(needle)
    )
  }, [apps, query])

  // Reset the query (and, via the next effect, the highlight) each time the
  // launcher opens so it never reopens onto a stale search.
  useEffect(() => {
    if (open) setQuery("")
  }, [open])

  // Keep the highlight in range whenever the result list changes (query edits
  // or apps churn). Clamping here also satisfies the "reset to 0" rule.
  useEffect(() => {
    setHighlight((current) => {
      if (filtered.length === 0) return 0
      return Math.min(current, filtered.length - 1)
    })
  }, [filtered])

  // Autofocus the search field when the panel opens.
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  if (!open) return null

  const launch = (id: AppId): void => {
    onLaunch(id)
    onClose()
  }

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ): void => {
    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault()
        setHighlight((current) =>
          filtered.length === 0 ? 0 : Math.min(current + 1, filtered.length - 1)
        )
        break
      }
      case "ArrowUp": {
        event.preventDefault()
        setHighlight((current) => Math.max(current - 1, 0))
        break
      }
      case "Enter": {
        event.preventDefault()
        const target = filtered[highlight]
        if (target) launch(target.id)
        break
      }
      case "Escape": {
        event.preventDefault()
        onClose()
        break
      }
      default:
        break
    }
  }

  const handleQueryChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    setQuery(event.target.value)
    setHighlight(0)
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh]">
        {/* Overlay — click anywhere outside the panel to dismiss. */}
        <button
          aria-label={translate("environment.launcher.close")}
          className="fixed inset-0 cursor-default bg-background/40"
          onClick={onClose}
          type="button"
        />
        <motion.div
          animate={{ opacity: 1, scale: 1 }}
          aria-label={translate("environment.launcher.title")}
          aria-modal="true"
          className="relative z-10 w-[min(32rem,90vw)] overflow-hidden border border-border bg-card/90 text-foreground shadow-2xl backdrop-blur-xl"
          exit={{ opacity: 0, scale: 0.96 }}
          initial={{ opacity: 0, scale: 0.96 }}
          role="dialog"
          style={{ borderRadius: `${launcherRadius}px` }}
          transition={{ duration: 0.16, ease: "easeOut" }}
        >
          <div className="border-border/60 border-b p-3">
            <input
              aria-label={translate("environment.launcher.search")}
              className="w-full bg-transparent px-2 py-1.5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
              onChange={handleQueryChange}
              onKeyDown={handleKeyDown}
              placeholder={translate("environment.launcher.searchPlaceholder")}
              ref={inputRef}
              type="text"
              value={query}
            />
          </div>

          <div
            aria-label={translate("environment.launcher.applications")}
            className="max-h-80 overflow-y-auto p-2"
            role="listbox"
          >
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-muted-foreground text-sm">
                {translate("environment.launcher.empty")}
              </p>
            ) : (
              filtered.map((app, index) => {
                const Icon = APP_ICONS[app.id]
                const selected = index === highlight
                return (
                  <button
                    aria-selected={selected}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted/60"
                    )}
                    key={app.id}
                    onClick={() => launch(app.id)}
                    onMouseMove={() => setHighlight(index)}
                    role="option"
                    type="button"
                  >
                    <Icon aria-hidden="true" className="size-5 shrink-0" />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-medium text-sm">
                        {app.name}
                      </span>
                      <span
                        className={cn(
                          "truncate text-xs",
                          selected
                            ? "text-primary-foreground/80"
                            : "text-muted-foreground"
                        )}
                      >
                        {app.subtitle}
                      </span>
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
