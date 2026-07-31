// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { DotGothic16, Geist } from "next/font/google"
import localFont from "next/font/local"

import "./globals.css"
import { cn } from "@/lib/utils"
import { ThemeProvider } from "@/providers/theme-provider"

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
})

// Self-hosted so the build has no runtime dependency on the Google Fonts CDN.
// The variable woff2 (latin, weight axis 100–800) covers every weight we use.
const jetbrainsMono = localFont({
  display: "swap",
  src: "../assets/fonts/jetbrains-mono-latin.woff2",
  variable: "--font-mono",
  weight: "100 800",
})

// Dot-matrix Japanese heading face (matches the portfolio's --font-heading-ja);
// used by the scrambling header status.
const dotGothic = DotGothic16({
  preload: true,
  subsets: ["latin"],
  variable: "--font-heading-ja",
  weight: "400",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      className={cn(
        "antialiased",
        fontSans.variable,
        "font-mono",
        jetbrainsMono.variable,
        dotGothic.variable
      )}
      lang="en"
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
