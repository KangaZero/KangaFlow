// Shared track types, playlist data, and formatting helpers.
// Imported by both media-player and track-list to avoid circular dependencies.

export type TrackSrc = `/tracks/${string}.mp3`

export type Track = {
  title: string
  composer: string
  artist?: string
  duration: number // seconds — used as slider range fallback before metadata loads
  src: TrackSrc // URL served by Next.js static export, e.g. "/KangaFlow/tracks/..."
  album?: string
  year?: number
  genre?: string
  coverSrc?: string // URL to album-art image (square, 200×200+ recommended)
  accentColor?: string // dominant hex/oklch colour for optional player tint
}

type Minutes = number & { _brand: "minutes" }
type Seconds = number & { _brand: "seconds" }

// Non-empty tuple so PLAYLIST[0] is always Track (satisfies noUncheckedIndexedAccess).
// Add more tracks: nix run nixpkgs#yt-dlp -- -x --audio-format mp3 --audio-quality 0 \
//   -o "public/tracks/%(id)s.%(ext)s" "<youtube-url>"
//   Get the duration via nix run nixpkgs#yt-dlp -- --print duration "<youtube-url>"
// To slice and take a particular section in seconds --download-sections "*0-203"
export const PLAYLIST: readonly [Track, ...Track[]] = [
  {
    composer: "Wizet / Nexon",
    duration: 377,
    genre: "Game OST",
    src: "/tracks/maplestory-intro.mp3",
    title: "MapleStory — Intro Theme",
  },
  {
    composer: "Sergei Bortkiewicz",
    duration: 375,
    genre: "Classical",
    src: "/tracks/bortkiewicz-op24-1.mp3",
    title: "Nocturne (Diana), Op.24/1",
  },
  {
    artist: "Nikolai Lvovich Lugansky",
    composer: "Nikolai Girshevich Kapustin",
    duration: 203,
    genre: "Jazz/Classical",
    src: "/tracks/kapustin-eight-concert-etudes-op40-7.mp3",
    title: "Eight Concert Etudes, Op.40/7",
  },
  {
    artist: "Yunchan Lim",
    composer: "Fryderyk Franciszek Chopin",
    duration: 135,
    genre: "Classical",
    src: "/tracks/chopin-op-10-10.mp3",
    title: "Etude (A Flat Major), Op.10/10",
  },
]

// Format a whole-second count as m:ss (e.g. 258 → "4:18"). Pure + exported so it
// can be unit-tested independently of the component.
export function formatSecondsToMMSS(
  totalSeconds: number
): `${Minutes}:${Seconds}` {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safe / 60) as Minutes
  const seconds = (safe % 60) as Seconds
  return `${minutes}:${seconds.toString().padStart(2, "0") as `${Seconds}`}`
}
