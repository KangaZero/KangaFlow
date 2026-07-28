"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { ArrowLeft, ArrowRight, RotateCw, Star } from "lucide-react"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { useLocale } from "@/providers/locale-provider"

// Bookmarks persist across sessions (localStorage).
const STORAGE_KEY = "kangaflow:niri-bookmarks"

function loadBookmarks(): string[] {
  if (typeof window === "undefined") return []
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "[]"
    )
    return Array.isArray(parsed)
      ? parsed.filter((u): u is string => typeof u === "string")
      : []
  } catch {
    return []
  }
}

// Short label for a bookmark chip.
function hostOf(raw: string): string {
  try {
    return new URL(raw).hostname
  } catch {
    return raw
  }
}

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
  const [bookmarks, setBookmarks] = useState<string[]>(loadBookmarks)

  const url = history[index] ?? FALLBACK_URL
  const canBack = index > 0
  const canForward = index < history.length - 1
  const isBookmarked = bookmarks.includes(url)

  // Persist favourites whenever they change.
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks))
  }, [bookmarks])

  const toggleBookmark = (): void => {
    setBookmarks((bm) =>
      bm.includes(url) ? bm.filter((u) => u !== url) : [...bm, url]
    )
  }

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
          aria-pressed={isBookmarked}
          className={cn(
            TOOLBAR_BUTTON,
            isBookmarked ? "text-yellow-500" : "hover:text-yellow-500"
          )}
          onClick={toggleBookmark}
          type="button"
        >
          <Star
            aria-hidden
            className={cn("size-4", isBookmarked && "fill-current")}
          />
        </button>
      </div>
      {bookmarks.length > 0 ? (
        <div className="flex items-center gap-1 overflow-x-auto border-border border-b bg-card px-3 py-1.5">
          {bookmarks.map((bm) => (
            <button
              className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-muted-foreground text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
              key={bm}
              onClick={() => navigate(bm)}
              title={bm}
              type="button"
            >
              <Star
                aria-hidden
                className="size-3 fill-current text-yellow-500"
              />
              <span className="max-w-32 truncate">{hostOf(bm)}</span>
            </button>
          ))}
        </div>
      ) : null}
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
