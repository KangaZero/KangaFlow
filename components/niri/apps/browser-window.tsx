"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { ArrowLeft, ArrowRight, RotateCw, Star } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { useLocale } from "@/providers/locale-provider"

// A real (sandboxed) browser tab. Loads pages in an <iframe sandbox> — the
// portfolio's live site frames fine; note many external sites send
// X-Frame-Options and will refuse to load. Cross-origin frames hide their own
// history, so back/forward track OUR navigations here and reload remounts the
// frame (key bump). In-page link clicks inside the frame aren't tracked.

// Same-origin home of the CURRENT instance (dev localhost or the live Pages
// deploy), derived from the environment page's own URL minus the trailing
// /environment. Same-origin frames cleanly (no X-Frame-Options gamble) and lets
// you actually browse the running site.
const FALLBACK_URL = "https://kangazero.github.io/KangaFlow/"
function currentHome(): string {
  if (typeof window === "undefined") return FALLBACK_URL
  const { origin, pathname } = window.location
  return `${origin}${pathname.replace(/\/environment\/?$/, "")}`
}

// Bare input → a loadable URL: keep http(s) as-is, otherwise assume https.
function normalizeUrl(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed === "") return currentHome()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

const TOOLBAR_BUTTON =
  "rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40"

export function BrowserWindow(): React.JSX.Element {
  const { translate } = useLocale()
  // History stack + cursor drive back/forward; `reloadKey` remounts the frame.
  const [history, setHistory] = useState<string[]>(() => [currentHome()])
  const [index, setIndex] = useState(0)
  const [address, setAddress] = useState(currentHome)
  const [reloadKey, setReloadKey] = useState(0)

  const url = history[index] ?? FALLBACK_URL
  const canBack = index > 0
  const canForward = index < history.length - 1

  const navigate = (to: string): void => {
    const next = normalizeUrl(to)
    // Drop any forward entries, then push the new URL and move the cursor to it.
    setHistory((h) => [...h.slice(0, index + 1), next])
    setIndex(index + 1)
    setAddress(next)
  }

  const step = (delta: number): void => {
    const target = index + delta
    const entry = history[target]
    if (!entry) return
    setIndex(target)
    setAddress(entry)
  }

  return (
    <div className="flex h-full w-full flex-col bg-background text-foreground">
      <div className="flex items-center gap-2 border-border border-b bg-card px-3 py-2 text-card-foreground">
        <div className="flex items-center gap-1">
          <button
            aria-label={translate("environment.browser.back")}
            className={TOOLBAR_BUTTON}
            disabled={!canBack}
            onClick={() => step(-1)}
            type="button"
          >
            <ArrowLeft aria-hidden className="size-4" />
          </button>
          <button
            aria-label={translate("environment.browser.forward")}
            className={TOOLBAR_BUTTON}
            disabled={!canForward}
            onClick={() => step(1)}
            type="button"
          >
            <ArrowRight aria-hidden className="size-4" />
          </button>
          <button
            aria-label={translate("environment.browser.reload")}
            className={TOOLBAR_BUTTON}
            onClick={() => setReloadKey((k) => k + 1)}
            type="button"
          >
            <RotateCw aria-hidden className="size-4" />
          </button>
        </div>
        <form
          className="flex min-w-0 flex-1"
          onSubmit={(event) => {
            event.preventDefault()
            navigate(address)
          }}
        >
          <input
            aria-label={translate("environment.browser.address")}
            className="w-full truncate rounded-full border border-border bg-muted px-3 py-1.5 text-foreground text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => setAddress(event.target.value)}
            spellCheck={false}
            value={address}
          />
        </form>
        <button
          aria-label={translate("environment.browser.bookmark")}
          className={cn(TOOLBAR_BUTTON, "hover:text-yellow-500")}
          type="button"
        >
          <Star aria-hidden className="size-4" />
        </button>
      </div>
      <iframe
        className="min-h-0 w-full flex-1 border-0 bg-background"
        key={reloadKey}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        src={url}
        title={translate("environment.apps.browser.name")}
      />
    </div>
  )
}
