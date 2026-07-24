// Share-intent URL builder for the platforms surfaced by the ShareButton's hover
// icons. Pure + typed so it can be unit-tested; the component itself only fires
// an onIconClick(platform) callback and implements no sharing of its own.

export type SharePlatform = "github" | "x" | "facebook"

export type ShareTarget = {
  url: string
  text: string
}

/**
 * The web share-intent URL for a platform, or `null` when the platform has no
 * such endpoint (GitHub) — callers fall back to copying the link. X and Facebook
 * expose documented intent endpoints; both operands are percent-encoded.
 */
export function shareIntentUrl(
  platform: SharePlatform,
  { url, text }: ShareTarget
): string | null {
  switch (platform) {
    case "x":
      return `https://x.com/intent/tweet?text=${encodeURIComponent(
        text
      )}&url=${encodeURIComponent(url)}`
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        url
      )}`
    case "github":
      return null
  }
}
