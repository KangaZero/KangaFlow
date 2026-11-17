// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Every portfolio shown on the timeline, oldest → newest. `slug` keys the i18n
// description; names/years/urls are brand facts, so they live here. Shared by
// the timeline list and its fullscreen screenshot viewer.

import type { StaticImageData } from "next/image"

import personalPortfolioImg from "@/assets/timeline/01-personal-portfolio.webp"
import myPageImg from "@/assets/timeline/02-my-page.webp"
import kangaWorksImg from "@/assets/timeline/03-kanga-works-2023.webp"
import portfolioImg from "@/assets/timeline/04-must-finish-2025.webp"
import kangaFlowImg from "@/assets/timeline/05-kangaflow.webp"
import type { PlaceholderKey } from "@/lib/image-placeholders"

export type PortfolioSlug =
  | "personalPortfolio"
  | "myPage"
  | "kangaWorks"
  | "portfolio"
  | "kangaFlow"

export type Portfolio = {
  slug: PortfolioSlug
  name: string
  year: string
  image: StaticImageData
  /** Blur-up placeholder for `image` (lib/image-placeholders). */
  placeholder: PlaceholderKey
  liveUrl: string
  repoUrl: string
  current?: boolean
}

export const PORTFOLIOS: readonly Portfolio[] = [
  {
    image: personalPortfolioImg,
    liveUrl: "https://kangazero.github.io/kangazero.Personal_Portfolio.io/",
    name: "Personal Portfolio",
    placeholder: "timeline/01-personal-portfolio",
    repoUrl: "https://github.com/KangaZero/kangazero.Personal_Portfolio.io",
    slug: "personalPortfolio",
    year: "2022",
  },
  {
    image: myPageImg,
    liveUrl: "https://kangazero.github.io/my-page/",
    name: "my-page",
    placeholder: "timeline/02-my-page",
    repoUrl: "https://github.com/KangaZero/my-page",
    slug: "myPage",
    year: "2023",
  },
  {
    image: kangaWorksImg,
    liveUrl: "https://kanga-works2023.vercel.app/",
    name: "Kanga Works",
    placeholder: "timeline/03-kanga-works-2023",
    repoUrl: "https://github.com/KangaZero/KangaWorks2023",
    slug: "kangaWorks",
    year: "2023",
  },
  {
    image: portfolioImg,
    liveUrl: "https://must-finish-2025.vercel.app/en",
    name: "must-finish",
    placeholder: "timeline/04-must-finish-2025",
    repoUrl: "https://github.com/KangaZero/portfolio",
    slug: "portfolio",
    year: "2025",
  },
  {
    current: true,
    image: kangaFlowImg,
    liveUrl: "https://kangazero.github.io/KangaFlow/en",
    name: "KangaFlow",
    placeholder: "timeline/05-kangaflow",
    repoUrl: "https://github.com/KangaZero/KangaFlow",
    slug: "kangaFlow",
    year: "2026",
  },
]

/** Shared-layout id linking a thumbnail to its fullscreen image. */
export const shotLayoutId = (slug: PortfolioSlug): string =>
  `timeline-shot-${slug}`

export const pad2 = (value: number): string => String(value).padStart(2, "0")
