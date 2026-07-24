"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import Image, { type StaticImageData } from "next/image"
import { FaGithub } from "react-icons/fa6"
import personalPortfolioImg from "@/assets/timeline/01-personal-portfolio.png"
import myPageImg from "@/assets/timeline/02-my-page.png"
import kangaWorksImg from "@/assets/timeline/03-kanga-works-2023.png"
import portfolioImg from "@/assets/timeline/04-must-finish-2025.png"
import kangaFlowImg from "@/assets/timeline/05-kangaflow.png"
import { LocaleTransition } from "@/components/locale-transition"
import { CardBody, CardContainer, CardItem } from "@/components/ui/3d-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Timeline, type TimelineEntry } from "@/components/ui/timeline"
import { useLocale } from "@/providers/locale-provider"

// One entry per portfolio. `slug` keys the i18n description; the name/year/urls
// are brand facts, so they live here rather than in the dictionaries.
type Portfolio = {
  slug:
    | "personalPortfolio"
    | "myPage"
    | "kangaWorks"
    | "portfolio"
    | "kangaFlow"
  name: string
  year: string
  image: StaticImageData
  liveUrl: string
  repoUrl: string
  current?: boolean
}

// Oldest → newest; the current site is flagged for the badge.
const PORTFOLIOS: readonly Portfolio[] = [
  {
    image: personalPortfolioImg,
    liveUrl: "https://kangazero.github.io/kangazero.Personal_Portfolio.io/",
    name: "Personal Portfolio",
    repoUrl: "https://github.com/KangaZero/kangazero.Personal_Portfolio.io",
    slug: "personalPortfolio",
    year: "2022",
  },
  {
    image: myPageImg,
    liveUrl: "https://kangazero.github.io/my-page/",
    name: "my-page",
    repoUrl: "https://github.com/KangaZero/my-page",
    slug: "myPage",
    year: "2023",
  },
  {
    image: kangaWorksImg,
    liveUrl: "https://kanga-works2023.vercel.app/",
    name: "Kanga Works",
    repoUrl: "https://github.com/KangaZero/KangaWorks2023",
    slug: "kangaWorks",
    year: "2023",
  },
  {
    image: portfolioImg,
    liveUrl: "https://must-finish-2025.vercel.app/en",
    name: "must-finish",
    repoUrl: "https://github.com/KangaZero/portfolio",
    slug: "portfolio",
    year: "2025",
  },
  {
    current: true,
    image: kangaFlowImg,
    liveUrl: "https://kangazero.github.io/KangaFlow/en",
    name: "KangaFlow",
    repoUrl: "https://github.com/KangaZero/KangaFlow",
    slug: "kangaFlow",
    year: "2026",
  },
]

function PortfolioCard({ portfolio }: { portfolio: Portfolio }) {
  const { translate } = useLocale()

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="flex items-center gap-3">
        <h3 className="font-heading font-semibold text-lg">{portfolio.name}</h3>
        {portfolio.current ? (
          <Badge variant="secondary">{translate("timeline.current")}</Badge>
        ) : null}
        <Button
          aria-label={translate("timeline.viewSource")}
          asChild
          className="ml-auto"
          size="icon"
          variant="ghost"
        >
          <a href={portfolio.repoUrl} rel="noreferrer" target="_blank">
            <FaGithub />
          </a>
        </Button>
      </div>

      <LocaleTransition className="max-w-xl">
        <p className="text-muted-foreground text-sm">
          {translate(`timeline.entries.${portfolio.slug}`)}
        </p>
      </LocaleTransition>

      <CardContainer className="w-full" containerClassName="justify-start py-4">
        <CardBody className="h-auto w-full max-w-xl">
          <CardItem className="w-full" translateZ={40}>
            <a
              aria-label={translate("timeline.visitSite")}
              href={portfolio.liveUrl}
              rel="noreferrer"
              target="_blank"
            >
              <Image
                alt={portfolio.name}
                className="h-auto w-full rounded-xl border border-border object-cover shadow-md"
                src={portfolio.image}
              />
            </a>
          </CardItem>
        </CardBody>
      </CardContainer>
    </div>
  )
}

export function TimelineView() {
  const { translate } = useLocale()

  const data: TimelineEntry[] = PORTFOLIOS.map((portfolio) => ({
    content: <PortfolioCard portfolio={portfolio} />,
    title: portfolio.year,
  }))

  return (
    <main className="min-h-svh w-full pb-28 sm:pb-0">
      <header className="mx-auto max-w-7xl px-6 pt-16 pb-2 md:px-10">
        <LocaleTransition>
          <h1 className="font-heading font-semibold text-3xl sm:text-4xl">
            {translate("timeline.heading")}
          </h1>
          <p className="mt-2 text-muted-foreground text-sm">
            {translate("timeline.subtitle")}
          </p>
        </LocaleTransition>
      </header>
      <Timeline data={data} />
    </main>
  )
}
