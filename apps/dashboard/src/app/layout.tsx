import './globals.css'
import type { ReactNode } from 'react'
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata = {
  title: 'GTM Intelligence',
  description: 'Healthtech GTM market-intelligence signals',
  // Private instance holds confidential watchlist data — keep it out of indexes.
  robots: process.env.INSTANCE_MODE === 'private' ? { index: false, follow: false } : undefined,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body>
        <header className="border-b px-6 py-3">
          <nav className="mx-auto flex max-w-3xl gap-4 text-sm">
            <a href="/" className="font-semibold">Signals</a>
            <a href="/watchlist">Watchlist</a>
            <a href="/ontology">Ontology</a>
            <a href="/runs">Run health</a>
          </nav>
        </header>
        {children}
      </body>
    </html>
  )
}
