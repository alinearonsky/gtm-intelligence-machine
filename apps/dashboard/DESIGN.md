# GTM Intelligence Dashboard — Design System

Restrained, data-dense product UI. The job is legibility and trust, not decoration:
a non-technical GTM user should open the dashboard and immediately know who to act
on and why. Reference points: Linear / Vercel dashboards — quiet surface, strong
typographic hierarchy, color used only to carry meaning.

## 0. Visual direction — Stellate reskin (2026-07-14, branch `feat/stellate-reskin`)

The surface leans on **Stellate's** engineered-console look: cool navy chrome, a
blue primary, and hairline slate borders. It stays restrained — this is a tool, not
a marketing page — but the body now reads as a real console instead of flat white.

- **Chrome vs. content:** the top bar is dark navy (`--sidebar` family) with a blue
  logo mark. Content sits on a near-white cool background with a faint blue
  atmospheric wash falling from under the header (`body` gradient, ~420px, fixed).
- **Two colour jobs, kept separate.** Periwinkle-indigo (`--primary`, sampled from
  stellate.co) is the *interactive / chrome* accent — links on hover, focus rings,
  the lens switcher, org-page micro-labels. Coral/violet/grey (`--priority-*`)
  remain the *semantic* colours and still obey the two-places rule below. Coral
  (act-now) is Stellate's signature warm doing double duty as "urgent". Never use
  the indigo primary to signal priority, and never use a priority colour for a
  plain interactive control.
- **Elevation:** surfaces read as raised via soft, cool-navy-tinted shadows, not
  heavier borders. Tokens: `--shadow-card` (cards) and `--shadow-panel` (tabs,
  filter bar, spec panels, monogram tiles). Every card is `ring-1 ring-border` +
  `shadow-card`.
- **Known debt:** the `.dark` block still holds the pre-reskin neutral palette —
  dark mode has not been re-tuned to Stellate. The dashboard ships light-only for
  now, so this is deferred, not blocking.

## 1. Tokens (source of truth: `src/app/globals.css`)

All values are CSS variables consumed through Tailwind. Never hard-code a hex.

- **Type:** `--font-sans` = Geist; `--font-geist-mono` = Geist Mono (numbers, IDs, ATS slugs, DSL only).
- **Surface:** `background`, `card`, `muted`, `border`, `foreground`, `muted-foreground`.
- **Priority (semantic — the only "brand" color):**
  - `--priority-act-now` (coral, Stellate `#FF7752`) — a live buying window, act
    this week. Deliberately Stellate's signature warm: the one warm accent on the
    dashboard doubles as the "urgent" semantic.
  - `--priority-watch` (violet) — real movement, monitor.
  - `--priority-ignore` / `--baseline` (neutral grey) — snapshot, not an event.
- **Radius:** `rounded-md` for tiles/logos, `rounded-lg` for cards/containers, `rounded-full` for pills.

Priority color appears in exactly two places per card: the left border (`border-l-2`)
and the priority pill. Nowhere else — that is what keeps the amber meaningful.

## 2. Primitives

- **OrgSignalCard** (`components/org-signal-card.tsx`) — the core unit of the feed.
  One card per company (never per signal). Anatomy: logo + company name (lg/semibold)
  + segment subtitle on the left; priority pill on the right; lead rationale; a
  stacked list of that company's signals (humanized type · stage · strength dots ·
  evidence); footer with the outreach-brief action.
- **SignalCard** (`components/signal-card.tsx`) — single-signal card used only on the
  org profile page. Same visual language, humanized labels.
- **OrgLogo** (`components/org-logo.tsx`) — Clearbit logo by domain, monogram-tile
  fallback on error/missing. Never renders a broken image.
- **PriorityTabs** (`components/priority-tabs.tsx`) — All / Act now / Watch segmented
  control; the primary way to cut the feed. URL-driven (`?priority=`).
- **StrengthDots**, **EvidencePopover**, **Badge**, **Card**, **Table** — shared.

## 3. Language rule (`lib/humanize.ts`)

The DB stores machine slugs (`governance-investment`, `mid`, `ehr-vendor`, `act-now`).
The UI NEVER shows a raw slug. Every slug passes through a humanize map (with a
title-cased fallback) so a new rule can ship without printing a broken label. Mono
font is reserved for genuinely technical values (IDs, ATS names, the condition DSL).

## 4. Information architecture

- **/** — "Companies to watch": the single primary view. Grouped, priority-led,
  filterable. Absorbs what used to be split between the feed and the watchlist.
- **/ontology** — "How matching works": plain-English explanation of the product lens
  (what a good-fit buyer looks like) and the signal rules. Trust surface. Demoted to
  the footer. Carries a labeled placeholder for the future "tune from my site + docs".
- **/watchlist** — "Monitoring": every tracked company + scan health (summary stats +
  table). Plumbing. Demoted to the footer.
- **/runs** — "Scan history": full run log, reached from Monitoring.

**Shell (Stellate reskin):** a dark-navy left **icon rail** (`components/app-sidebar.tsx`)
is the persistent primary nav — Companies (`/`), Monitoring (`/watchlist`), Scans
(`/runs`), Matching (`/ontology`) — icon + label, active state highlighted. Above the
content sits a dark-navy top bar with a `GTM Intelligence / <lens>` breadcrumb + the
instance badge. This mirrors Stellate's console shell (left rail + dark chrome framing
light, wide content). The footer is now just a signature line; the routes it used to
hold moved into the rail. Content pages are left-aligned, `max-w-4xl`, `px-8`.
Priority tabs are an underline tab-strip (blue active underline), not a pill.

## 5. Accepted debt / follow-ups

- Full Lighthouse-100 + real-browser responsive QA pass not yet run against a
  production build (needs `DASHBOARD_DATABASE_URL`).
- "Tune matching from my site + docs" is a visible placeholder only, not implemented.
- Logos depend on Clearbit availability; small orgs fall back to monograms by design.
