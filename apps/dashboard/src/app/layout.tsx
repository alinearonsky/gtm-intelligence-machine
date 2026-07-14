import './globals.css'
import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { Geist, Geist_Mono } from 'next/font/google'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { LensSwitcher } from '@/components/lens-switcher'
import { SiteFooter } from '@/components/site-footer'
import { isPrivate } from '@/lib/instance'

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata = {
  title: 'GTM Intelligence',
  description: 'Healthtech GTM market-intelligence signals',
  // Private instance holds confidential watchlist data — keep it out of indexes.
  robots: process.env.INSTANCE_MODE === 'private' ? { index: false, follow: false } : undefined,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const priv = isPrivate()
  return (
    <html lang="en" className={cn('font-sans', geist.variable, geistMono.variable)}>
      <body className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-2.5">
            <Link href="/" className="text-sm font-semibold tracking-tight">GTM Intelligence</Link>
            <div className="flex items-center gap-3">
              <Suspense fallback={null}>
                <LensSwitcher />
              </Suspense>
              <span className={cn(
                'rounded-full border px-2 py-0.5 font-mono text-[11px]',
                priv ? 'border-priority-act-now/40 text-priority-act-now' : 'text-muted-foreground',
              )}>
                {priv ? 'private console' : 'public demo'}
              </span>
            </div>
          </div>
        </header>
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  )
}
