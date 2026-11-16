"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import "./header-date.css"
import "./bounceIn.css"

import { CloudOff } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { useWeatherForecast } from "@/api/queries/useWeatherForecast"
import { HoverPopover } from "@/components/ui/hover-popover"
import { MorphText, morphGlyphCount } from "@/components/ui/morph-text"
import { Skeleton } from "@/components/ui/skeleton"
import { WorkplaceCard } from "@/components/workplace-card"
import { person } from "@/lib/person"
import {
  getTemperatureColor,
  getWeatherIconKey,
  WEATHER_ICON,
} from "@/lib/weather"
import { WEBMCP_INTERACTIVE_ELEMENTS } from "@/lib/webmcp"
import { useAchievements } from "@/providers/achievements-provider"
import { useLocale } from "@/providers/locale-provider"

const HeaderDate = () => {
  const { unlockAchievement } = useAchievements()
  const { translate } = useLocale()
  const [latitude, longitude] = person.locationCoordinates
  const weatherState = useWeatherForecast({
    forecastDays: 1,
    latitude,
    longitude,
  })
  const weather =
    weatherState.status === "success" ? weatherState.weather : null
  const [isHovered, setIsHovered] = useState(false)
  const [isJellyHoverAnimationOver, setIsJellyHoverAnimationOver] =
    useState(false)
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
  }, [])

  // KangaFlow i18n treats arrays as leaves, so index the returned array rather
  // than keying `headerDate.days.<n>` directly.
  const day = now ? (translate("headerDate.days")[now.getDay()] ?? "") : ""
  const allButLastCharDay = day.slice(0, -1)
  const lastDayChar = day.slice(-1)
  const date = now?.getDate() ?? null
  const hour = now?.getHours() ?? null
  const isDay = weather
    ? weather.isDay
    : hour !== null
      ? hour >= 6 && hour < 18
      : true
  const month = now
    ? (translate("headerDate.months")[now.getMonth()] ?? "")
    : ""
  const temperature = weather ? Math.round(weather.temperature) : 0
  const dateText = date === null ? "" : String(date)
  // Stagger offsets: day → last char → month → date, one running index.
  const morphRuns = useMemo(() => {
    const lengths = [allButLastCharDay, lastDayChar, month, dateText].map(
      morphGlyphCount
    )
    const offsets = lengths.map((_, i) =>
      lengths.slice(0, i).reduce((sum, n) => sum + n, 0)
    )
    return { offsets, total: lengths.reduce((sum, n) => sum + n, 0) }
  }, [allButLastCharDay, lastDayChar, month, dateText])
  const runOffset = (i: number) => morphRuns.offsets[i] ?? 0

  // WMOCodeDescriptions -> lib/weather + i18n (the KangaFlow equivalent).
  // Defaults to the clear-sky (code 0) icon/description when data is missing.
  const code = weather?.code ?? 0
  const WeatherIcon = WEATHER_ICON[getWeatherIconKey(code, isDay)]
  const weatherDescription = translate(
    `weather.conditions.${code}.${isDay ? "day" : "night"}`
  )

  const gradient = getTemperatureColor(temperature)

  // Reveal the P5 date box: replay the jelly animation and grant the easter-egg
  // achievement. Opening/closing the card itself is HoverPopover's job — this
  // only mirrors its state into the CSS classes below.
  const handleReveal = () => {
    setIsJellyHoverAnimationOver(false)
    unlockAchievement("snoopy-detective")
  }

  return (
    <HoverPopover
      align="start"
      // The card draws its own plate + shard silhouette; the popover shell
      // only positions it (transparent, unpadded, no border/shadow).
      className="w-auto border-0 bg-transparent p-0 shadow-none"
      id={WEBMCP_INTERACTIVE_ELEMENTS.headerDatePopoverPrimitiveTrigger}
      onOpenChange={setIsHovered}
      trigger={
        // biome-ignore lint/a11y/noStaticElementInteractions: hover/touch is a progressive-enhancement easter egg; the fallback text keeps the date accessible.
        // biome-ignore lint/a11y/useKeyWithClickEvents: same easter-egg rationale — the fallback text keeps the date fully accessible without the click.
        <div
          className="header-date-trigger"
          onClick={handleReveal}
          onPointerEnter={handleReveal}
        >
          <div className="fallback">
            {day} {month} {date}
          </div>

          <div className={`shape-wrapper ${isHovered ? "active" : ""}`}>
            <div
              className={`shape cyan-fill jelly ${isJellyHoverAnimationOver ? "hidden" : ""}`}
              onAnimationEnd={(event) => {
                if (event.animationName === "jelly") {
                  setIsJellyHoverAnimationOver(true)
                }
              }}
            >
              <svg
                height="35"
                preserveAspectRatio="none"
                viewBox="0 0 200 35"
                width="100%"
              >
                <title>cyan shape</title>
                <rect height="35" width="200" />
              </svg>
            </div>
            <div
              className={`shape red-fill jelly ${isJellyHoverAnimationOver ? "scale-125" : ""}`}
            >
              <svg
                height="35"
                preserveAspectRatio="none"
                viewBox="0 0 200 35"
                width="100%"
              >
                <title>red shape</title>
                <rect height="35" width="200" />
              </svg>
            </div>
          </div>

          <div className="img-wrapper">
            <div
              className={`p5DateBox ransom-on-page ${isHovered ? "hover-active morph-on" : ""}`}
            >
              <div className="p5DateDay">
                <span className="p5Day bounceIn">
                  <MorphText
                    offset={runOffset(0)}
                    text={allButLastCharDay}
                    total={morphRuns.total}
                  />
                </span>
                <span className="p5Day2 bounceIn">
                  <MorphText
                    offset={runOffset(1)}
                    text={lastDayChar}
                    total={morphRuns.total}
                  />
                </span>
                {weatherState.status === "success" && (
                  <span
                    className="p5DateWeatherIcon bounceIn"
                    title={weatherDescription}
                  >
                    <WeatherIcon className="size-8" />
                  </span>
                )}
                {weatherState.status === "loading" && (
                  <Skeleton
                    aria-label={translate("weather.loading")}
                    className="p5DateWeatherIcon bounceIn size-8 rounded-full"
                    role="status"
                  />
                )}
                {weatherState.status === "error" && (
                  <span
                    aria-label={translate("weather.unavailable")}
                    className="p5DateWeatherIcon bounceIn text-muted-foreground"
                    role="img"
                    title={translate("weather.unavailable")}
                  >
                    <CloudOff aria-hidden="true" className="size-8" />
                  </span>
                )}
              </div>
              <div className="p5DateMonthDay">
                <span className="p5Month bounceIn">
                  <MorphText
                    offset={runOffset(2)}
                    text={month}
                    total={morphRuns.total}
                  />
                </span>
                <span className="p5DateMonthDaySeparator bounceIn">/</span>
                <span className="p5Date bounceIn">
                  <MorphText
                    offset={runOffset(3)}
                    text={dateText}
                    total={morphRuns.total}
                  />
                </span>
                {weather && (
                  <>
                    <span
                      className="p5Temperature bounceIn"
                      // Idle: temperature-coloured glow. Hovered: the inline
                      // fill is dropped so the CSS accent sticker can show.
                      style={
                        isHovered
                          ? undefined
                          : {
                              textShadow: `0 0 3px ${gradient}`,
                              WebkitTextFillColor: gradient,
                            }
                      }
                    >
                      {temperature}
                    </span>
                    <span
                      className="p5Celsius bounceIn"
                      style={{
                        textShadow: `0 0 3px ${gradient}`,
                        WebkitTextFillColor: gradient,
                      }}
                    >
                      °C
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      }
    >
      <WorkplaceCard />
    </HoverPopover>
  )
}

export { HeaderDate }
