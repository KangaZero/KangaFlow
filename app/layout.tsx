// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { DotGothic16, Geist, JetBrains_Mono } from "next/font/google"

import "./globals.css"
import { cn } from "@/lib/utils"
import { ThemeProvider } from "@/providers/theme-provider"

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
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
