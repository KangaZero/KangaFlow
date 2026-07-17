"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import "./header-date.css"
import "./bounceIn.css"
import { useEffect, useState } from "react"

import { getDailyWeatherForecast } from "@/api/queries/getDailyWeatherForecast"
import { useAchievements } from "@/components/achievements-provider"
import { useLocale } from "@/components/locale-provider"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Skeleton } from "@/components/ui/skeleton"
import { person } from "@/lib/person"
import { getWeatherIconKey, WEATHER_ICON } from "@/lib/weather"

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

  function getTemperatureColor(temp: number) {
    switch (true) {
      case temp <= 0:
        return "dodgerblue"
      case temp > 0 && temp <= 15:
        return "deepskyblue"
      case temp > 15 && temp <= 25:
        return "orange"
      case temp > 25:
        return "red"
      default:
        return "gray"
    }
  }
  const gradient = getTemperatureColor(temperature)

  return (
    <HoverCard
      closeDelay={0}
      onOpenChange={setIsHovered}
      open={isHovered}
      openDelay={0}
    >
      <HoverCardTrigger asChild>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: hover/touch is a progressive-enhancement easter egg; the fallback text keeps the date accessible. */}
        <div
          className="link-wrapper"
          onMouseEnter={() => {
            setIsHovered(true)
            unlockAchievement("snoopy-detective")
          }}
          onMouseLeave={() => setIsHovered(false)}
          onTouchStart={() => {
            setIsHovered(!isHovered)
            unlockAchievement("snoopy-detective")
          }}
        >
          <div className="fallback">
            {day} {month} {date}
          </div>

          <div className={`shape-wrapper ${isHovered ? "active" : ""}`}>
            <div className="shape cyan-fill jelly">
              <svg
                height="35"
                preserveAspectRatio="none"
                viewBox="0 0 200 35"
                width="100%"
              >
                <title>cyan shape</title>
                <rect fill="#00FFFF" height="35" width="200" />
              </svg>
            </div>
            <div className="shape red-fill jelly">
              <svg
                height="35"
                preserveAspectRatio="none"
                viewBox="0 0 200 35"
                width="100%"
              >
                <title>red shape</title>
                <rect fill="#FF0000" height="35" width="200" />
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
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-auto font-mono text-xs">
        <p>{`${translate("headerCard.basedIn")} ${person.location}`}</p>
        <p>{translate("headerCard.workplace")}</p>
        <p>{translate("headerCard.status")}</p>
      </HoverCardContent>
    </HoverCard>
  )
}

export { HeaderDate }
