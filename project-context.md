---
title: WebUtilityLab — Project Context
created: 2026-08-11
updated: 2026-08-11
status: draft
sources:
  - _bmad-output/planning-artifacts/briefs/brief-WebUtilityLab-2026-08-11/brief.md
  - _bmad-output/planning-artifacts/prds/prd-WebUtilityLab-2026-08-11/prd.md
  - _bmad-output/planning-artifacts/ux-designs/ux-WebUtilityLab-2026-08-11/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-WebUtilityLab-2026-08-11/EXPERIENCE.md
---

# WebUtilityLab — Project Context

## What this is

WebUtilityLab is a **local-first, browser-based utility toolbox**. The first product in the toolbox is **CSV Rescue**: a tool that finds what's wrong with a CSV file without uploading it. A vendor sends a 12,000-row export; the user drops it onto the page; the page returns a list of problems, a data-quality score, an inferred schema, and an optional in-browser cleaning pass that downloads a fixed file. Nothing leaves the browser. The privacy claim is structural, not aspirational — the architecture enforces it.

The product category is **utility software for technical professionals** who handle messy third-party data and cannot send it to a cloud service. Adjacent audience: anyone in an environment where uploading to an external service is policy-restricted.

## Why now

The market opportunity is the gap between "open this CSV in Excel and squint" (no signal) and "upload to a hosted validator" (privacy violation). The first tool in the chain catches the trust cliff — vendor sent PII, you didn't notice, now you have a regulatory incident — before it happens.

## Form factor

- **Single page, scroll-driven** (per UX IA decision).
- **Desktop-primary** per PRD §2.2; mobile is layout-tolerant but not optimized.
- **No routing, no navigation** — empty state → active → results via state changes on one HTML page.
- **No build step required to ship**; runtime is the user's browser.

## Hard constraints (from PRD + UX)

These are **ship gates**, not aspirations. Violating any one invalidates the privacy claim.

- **Privacy Baseline (FR-23).** No analytics, no error reporters, no web fonts, no CDN with request-body logging, no third-party requests at runtime, audited transitive dependencies, open source from day 1. The page makes zero network calls after initial load — verifiable with DevTools open.
- **In-browser analysis only.** Files are read via `FileReader` / `File.stream()`; parsed locally; cleaned locally; downloaded locally via blob URL.
- **50 MB file cap** (FR-1); UTF-8 with or without BOM.
- **10-second analysis budget** (FR-6). Files whose upper-bound estimate exceeds the budget advance to the **refusal state** — no partial results.
- **Pre-flight time-band** during processing: `Working… (~3s ±30%)` — band and refusal are mutually exclusive states, never both.
- **Cleaning defaults are ALL OFF** (FR-5). Cleaning is opt-in per category. The modal opens with a **reversibility view** showing the original alongside the proposed cleaned version with a diff.
- **No spinners** — static "Working…" text per accessibility floor. `prefers-reduced-motion` respected (only motion is the 180ms theme transition).
- **WCAG 2.2 AA** + keyboard-first. Skip-links per page, visible focus rings, `aria-live="polite"` regions, semantic HTML throughout.

## Detection surface (FR-2, FR-3)

**8 anomaly categories** (findings): duplicates, missing values, invalid emails, invalid dates, inconsistent categorical, outliers, suspicious columns, PII.

**4 score categories**: completeness (non-null density), validity (format-correctness of typed columns), uniqueness (duplicate density, inverse), consistency (categorical casing / format consistency).

**Score bands** (visual rule, in DESIGN.md): `<60 err`, `60–79 warn`, `≥80 ok`.

## Brand & visual posture (locked)

- **Editorial / typography-led**, documentation posture — not SaaS landing.
- **Two-tone** (light/dark) via CSS-variable class flip on `<html>`; `localStorage` key `wul-theme`; system-preference seeds first paint.
- **Sans body, mono for data only** — system stack; no web fonts.
- **Color reserved for semantic meaning** — err / warn / pii / ok / accent. PII is its own category (violet) so the eye learns to scan for it.

## Open architecture questions

These are the **load-bearing calls** the architecture spine must answer. Everything else derives.

1. **Paradigm** — vanilla JS vs. a small reactive layer vs. a build-time framework. Privacy Baseline + zero-runtime-network pulls toward "no build step, no runtime deps." Worth coaching through.
2. **Parser shape** — streaming vs. in-memory. 50 MB cap and the 10-second budget push this hard.
3. **Analysis placement** — main thread vs. Web Worker. The 10-second budget and the UI thread's responsibility for the static "Working…" announcement and the refusal timer argue for a Worker boundary.
4. **Type inference + outlier detection** — column-by-column streaming passes vs. two-pass on the parsed rows.
5. **State management** — single `state` object vs. reducers vs. signals. Editorial single-page posture.

## Stack hints (seed, not decisions)

These are inherited from the privacy posture and the static-page IA, not authored here.

- **HTML + CSS + JS**, served as static files. No server runtime.
- **Static hosting** with a CDN that does not log request bodies (Cloudflare R2, Netlify, GitHub Pages — subject to auditing per Privacy Baseline).
- **No runtime dependencies** preferred. If a small library is needed (e.g. a CSV tokenizer), it must be vendored and audited, not `npm install`-from-CDN.
- **Open source from day 1** — repository is the privacy claim's audit trail.

## Downstream consumers

- **`bmad-create-epics-and-stories`** — once the architecture spine is landed, the work decomposes into shippable vertical slices. Each slice should land one or more ADs without violating the Privacy Baseline.
- **`bmad-build`** — implementation. The spine's `AD` IDs are the contract every story must respect.

## How to read this file

This is **foundational context**, not the architecture. The architecture spine (next file produced) carries the **invariants** only — the calls a future builder can't read off compliant code. Anything in this file that is a real trade-off (paradigm, parser, worker boundary, state shape) becomes an `AD-n` in the spine. Anything that is structural detail that the code will decide for itself stays here.