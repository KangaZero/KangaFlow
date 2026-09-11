"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import "./header-date.css"
import "./bounceIn.css"
import { useEffect, useState } from "react"

import { getDailyWeatherForecast } from "@/api/queries/getDailyWeatherForecast"
import { HoverPopover } from "@/components/ui/hover-popover"
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
  const { data } = getDailyWeatherForecast({
    forecastDays: 1,
    latitude,
    longitude,
    timezone: person.location,
  })
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
  const isDay = data
    ? Boolean(data.current.is_day)
    : hour !== null
      ? hour >= 6 && hour < 18
      : true
  const month = now
    ? (translate("headerDate.months")[now.getMonth()] ?? "")
    : ""
  const temperature = data ? Math.round(data.current.temperature_2m) : 0

  // WMOCodeDescriptions -> lib/weather + i18n (the KangaFlow equivalent).
  // Defaults to the clear-sky (code 0) icon/description when data is missing.
  const code = data?.current.weather_code ?? 0
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
      className="w-auto"
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
            <div className={`p5DateBox ${isHovered ? "hover-active" : ""}`}>
              <div className="p5DateDay">
                <span className="p5Day bounceIn">{allButLastCharDay}</span>
                <span className="p5Day2 bounceIn">{lastDayChar}</span>
                {data ? (
                  <span
                    className="p5DateWeatherIcon bounceIn"
                    title={weatherDescription}
                  >
                    <WeatherIcon className="size-8" />
                  </span>
                ) : (
                  <Skeleton className="p5DateWeatherIcon bounceIn size-8 rounded-full" />
                )}
              </div>
              <div className="p5DateMonthDay">
                <span className="p5Month bounceIn">{month}</span>
                <span className="p5DateMonthDaySeparator bounceIn">/</span>
                <span className="p5Date bounceIn">{date}</span>
                {data && (
                  <>
                    <span
                      className="p5Temperature bounceIn"
                      style={{
                        textShadow: `0 0 3px ${gradient}`,
                        WebkitTextFillColor: gradient,
                      }}
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
