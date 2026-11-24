// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Sanitize-and-insert for untrusted note HTML. Uses the native Sanitizer API
// (`Element.setHTML`) where the browser ships it, and lazy-loads DOMPurify
// only where it does not (Safari, older Chromium/Firefox), so supporting
// browsers never download the fallback. Both paths share one allowlist and are
// configured to behave the same: anything not listed is removed together with
// its content, and no aria-*/data-* attributes survive.

import type { Config, DOMPurify } from "dompurify"

// Exactly what the notes editor produces: styled <span>s for inline formats,
// block elements for lines (see BLOCK_TAGS in rich-text-caret), <br> breaks.
const ALLOWED_ELEMENTS = [
  "address",
  "b",
  "blockquote",
  "br",
  "div",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "i",
  "li",
  "ol",
  "p",
  "pre",
  "s",
  "span",
  "strong",
  "u",
  "ul",
] as const satisfies readonly string[]

// Inline formatting is stored as `style` (font-weight, font-size,
// text-decoration-line), so it has to survive.
const ALLOWED_ATTRIBUTES = ["style"] as const satisfies readonly string[]

const PURIFY_CONFIG = {
  // DOMPurify defaults keep these; the native Sanitizer drops them.
  ALLOW_ARIA_ATTR: false,
  ALLOW_DATA_ATTR: false,
  ALLOWED_ATTR: [...ALLOWED_ATTRIBUTES],
  ALLOWED_TAGS: [...ALLOWED_ELEMENTS, "#text"],
  KEEP_CONTENT: false,
} as const satisfies Config

let purifier: Promise<DOMPurify> | undefined

// One code-split request, shared by every caller.
function loadPurifier(): Promise<DOMPurify> {
  purifier ??= import("dompurify").then((mod) => mod.default)
  return purifier
}

export function hasNativeSanitizer(): boolean {
  return "setHTML" in Element.prototype
}

// Replace `el`'s children with the sanitized form of `html`.
export async function setSanitizedHtml(
  el: Element,
  html: string
): Promise<void> {
  if (hasNativeSanitizer()) {
    el.setHTML(html, {
      sanitizer: {
        attributes: [...ALLOWED_ATTRIBUTES],
        elements: [...ALLOWED_ELEMENTS],
      },
    })
    return
  }
  const purify = await loadPurifier()
  el.innerHTML = purify.sanitize(html, PURIFY_CONFIG)
}
