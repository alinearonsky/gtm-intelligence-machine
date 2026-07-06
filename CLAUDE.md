# GTM Intelligence Machine

Healthtech GTM market-intelligence platform. v1 engine: job posting signal
analyzer. Internal specs and plans live in the private overlay repo
(`gtm-intel-private`), not here.

## Hard rules
- **Not-a-wrapper rule:** the LLM only extracts ("what does this posting
  say?"). Interpretation is deterministic ontology rules (`ontology/*.yaml`)
  — versioned, tested, replayable over stored extractions.
- **Public/private split:** this repo is public (portfolio artifact). No
  employer-internal information here — no real target-org names in fixtures,
  tests, commits, or logs; employer watchlists live only in the private
  overlay repo.
- **No unattended outreach, no faked/backdated demo signals, no LinkedIn
  scraping, no paid data APIs (v1).**
- Baseline scans (an org's first scan) produce stage assessments only —
  never `act-now` signals.
