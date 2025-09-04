import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { NotificationProvider } from "@/components/notifications/notification-provider"
import Navbar from "@/components/elements/navbar"
import { WagmiProvider } from "@/components/providers/wagmi-provider"

export const metadata: Metadata = {
  title: "Arisan+ | Decentralized Social Saving",
  description: "Join collaborative savings pools with DeFi yields and gamification",
  generator: "Arisan+",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-neutral-950">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Geist+Mono:wght@100..900&display=swap"
          rel="stylesheet"
        />
        <style>{`
:root {
  --font-sans: "Geist", ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
  --font-mono: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}
html { font-family: var(--font-sans); }
        `}</style>
      </head>
      <body>
        <WagmiProvider>
          <Navbar />
          <NotificationProvider>{children}</NotificationProvider>
        </WagmiProvider>
      </body>
    </html>
  )
}
