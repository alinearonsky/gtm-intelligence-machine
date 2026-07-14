import './globals.css'
import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { Geist, Geist_Mono } from 'next/font/google'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { LensSwitcher } from '@/components/lens-switcher'
import { SiteFooter } from '@/components/site-footer'
import { AppSidebar } from '@/components/app-sidebar'
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
      <body className="flex min-h-dvh">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-sidebar-border bg-sidebar px-5 py-2.5 text-sidebar-foreground">
            <div className="flex items-center gap-2 text-sm">
              <Link href="/" className="font-semibold tracking-tight text-white">GTM Intelligence</Link>
              <span aria-hidden className="text-sidebar-foreground/40">/</span>
              <Suspense fallback={null}>
                <LensSwitcher />
              </Suspense>
            </div>
            <span className={cn(
              'rounded-full border px-2 py-0.5 font-mono text-[11px]',
              priv ? 'border-priority-act-now/50 text-priority-act-now' : 'border-white/20 text-sidebar-foreground',
            )}>
              {priv ? 'private console' : 'public demo'}
            </span>
          </header>
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </div>
      </body>
    </html>
  )
}
