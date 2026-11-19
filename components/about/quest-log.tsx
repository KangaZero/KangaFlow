"use client"

// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// About → Work as a quest log: the tech list as tool chips, each job a
// skewed slab tagged MAIN / SIDE QUEST with a blinking IN PROGRESS or a
// stamped CLEAR!, a plain one-line pitch, and its achievements as
// objectives that slide in when the quest opens. The quests are an
// animate-ui accordion (Base UI + Motion), so they open and close with a
// height animation and each quest's title is a real heading + button.

import Image, { type StaticImageData } from "next/image"
import { useState } from "react"
import accentureMark from "@/assets/accenture-mark.svg"
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/animate-ui/primitives/base/accordion"
import { interpolate } from "@/lib/i18n"
import { person } from "@/lib/person"
import { useLocale } from "@/providers/locale-provider"
import "@/components/about/about-sections.css"

type Experience = (typeof person.work.experiences)[number]

// Employer marks keyed by `logo` in person.ts; deriving the key type from
// there keeps this map exhaustive.
const MARKS: Record<
  Experience["logo"],
  { image: StaticImageData } | { label: string }
> = {
  accenture: { image: accentureMark },
  timewitch: { label: "TW" },
}

function QuestMark({
  logo,
  company,
}: {
  logo: Experience["logo"]
  company: string
}) {
  const mark = MARKS[logo]
  return (
    <span aria-hidden className="qa-mark relative">
      {"image" in mark ? (
        <Image alt={company} fill sizes="44px" src={mark.image} />
      ) : (
        mark.label
      )}
    </span>
  )
}

const FIRST_QUEST = person.work.experiences[0]?.company

export function QuestLog({ reduced }: { reduced: boolean }) {
  const { translate } = useLocale()
  // Controlled, so each panel knows when it is closed and can go inert.
  const [open, setOpen] = useState<readonly unknown[]>(
    FIRST_QUEST ? [FIRST_QUEST] : []
  )
  return (
    <>
      <div className="qa-tools">
        <h3>{translate("about.quest.tools")}</h3>
        <ul className="qa-chips">
          {person.technologies.map((tech, k) => (
            <li className="qa-chip" key={tech.name} style={{ "--k": k }}>
              <span>{tech.name}</span>
            </li>
          ))}
        </ul>
      </div>
      <Accordion
        className="qa-quests"
        multiple
        onValueChange={(value) => setOpen(value)}
        render={<ol />}
        value={[...open]}
      >
        {person.work.experiences.map((job, k) => {
          const isOpen = open.includes(job.company)
          return (
            <AccordionItem
              className="qa-quest"
              data-kind={job.kind}
              key={`${job.company}-${job.role}`}
              render={<li />}
              style={{ "--k": k }}
              value={job.company}
            >
              <AccordionHeader className="qa-header">
                <AccordionTrigger className="qa-trigger">
                  <QuestMark company={job.company} logo={job.logo} />
                  <span>
                    <span className="qa-tag">
                      {translate(
                        job.kind === "main"
                          ? "about.quest.main"
                          : "about.quest.side"
                      )}
                      {" · "}
                      {job.timeframe}
                    </span>
                    <span className="qa-company">{job.company}</span>
                    <span className="qa-role">{job.role}</span>
                    <span className="qa-pitch">{job.pitch}</span>
                  </span>
                  <span className="qa-status">
                    <span
                      className="qa-state"
                      data-state={job.current ? "live" : "clear"}
                    >
                      {translate(
                        job.current
                          ? "about.quest.inProgress"
                          : "about.quest.clear"
                      )}
                    </span>
                    <span aria-hidden className="qa-count">
                      {interpolate(translate("about.quest.objectives"), {
                        count: job.achievements.length,
                      })}{" "}
                      ▾
                    </span>
                  </span>
                </AccordionTrigger>
              </AccordionHeader>
              {/* keepRendered: the panel stays mounted so closing animates
                  too (without it the primitive unmounts the panel at once);
                  inert while closed keeps the collapsed text out of the tab
                  order and the accessibility tree. */}
              <AccordionPanel
                inert={!isOpen}
                keepRendered
                transition={
                  reduced
                    ? { duration: 0 }
                    : { duration: 0.4, ease: [0.25, 1, 0.5, 1] }
                }
              >
                <ul className="qa-objectives">
                  {job.achievements.map((achievement, i) => (
                    <li key={achievement} style={{ "--k": i }}>
                      {achievement}
                    </li>
                  ))}
                </ul>
              </AccordionPanel>
            </AccordionItem>
          )
        })}
      </Accordion>
    </>
  )
}
