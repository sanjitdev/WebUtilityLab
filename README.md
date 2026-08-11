# WebUtilityLab

A local-first, browser-based utility toolbox. The first product is **CSV Rescue**: find what's wrong with a CSV without uploading it.

## Status

**Planning complete. Implementation pending.**

This repository currently holds the planning artifacts produced by a BMad planning chain — brief, PRD, UX spines, architecture spine, and solution design — plus the BMad tooling that produced them. The product itself has not been implemented yet.

## Privacy Baseline (ship gate)

CSV Rescue makes zero network calls after page load. Verifiable with DevTools open. This is the architectural contract, not a discipline:

- No analytics. No error reporters. No web fonts.
- No CDN with request-body logging. Static assets only.
- Every transitive dependency is audited before each release.
- The repository is open source from day 1 — anyone can audit the privacy claim by reading the code.

## What's in this repository

```
.
├── README.md                          # this file
├── .gitignore                         # OS / IDE / build exclusions
├── project-context.md                 # foundational context
├── docs/
│   └── idea.md                        # pre-BMad ideation
├── _bmad-output/
│   ├── brainstorming/                 # brainstorm session outputs
│   └── planning-artifacts/
│       ├── briefs/                    # product brief
│       ├── prds/                      # PRD + polish + reconcile files
│       ├── ux-designs/                # DESIGN.md + EXPERIENCE.md + key-screen mocks
│       └── architectures/             # ARCHITECTURE-SPINE.md + SOLUTION-DESIGN.md
└── _bmad/                             # BMad tooling (planning chain runner)
```

### Reading the planning chain in order

1. **`docs/idea.md`** — the seed idea, pre-BMad.
2. **`_bmad-output/planning-artifacts/briefs/brief-WebUtilityLab-2026-08-11/brief.md`** — the product brief; what we're building and for whom.
3. **`_bmad-output/planning-artifacts/prds/prd-WebUtilityLab-2026-08-11/prd.md`** — the PRD; capabilities, FRs, NFRs.
4. **`_bmad-output/planning-artifacts/ux-designs/ux-WebUtilityLab-2026-08-11/`** — visual identity (`DESIGN.md`), experience contract (`EXPERIENCE.md`), and HTML mocks in `.working/`.
5. **`_bmad-output/planning-artifacts/architectures/arch-WebUtilityLab-2026-08-11/`** — the architecture spine (the invariants) and the solution design (the readable map for builders).

Each artifact carries a `.memlog.md` next to it — the canonical decision log for that run.

## CSV Rescue, in one paragraph

You drop a CSV onto the page (up to 50 MB, UTF-8 with or without BOM). The page returns a list of problems (duplicates, missing values, invalid emails/dates, inconsistent categorical, outliers, suspicious columns, PII), a data-quality score (0–100 across completeness / validity / uniqueness / consistency), an inferred schema, and an optional in-browser cleaning pass that downloads a fixed file. The file never leaves your browser. If the analysis would take longer than 10 seconds, the page refuses with helpful suggestions — no spinner, no partial results.

## Architecture, in twelve decisions

The architecture spine binds these as invariants. A future builder cannot choose incompatibly without violating the contract:

- **AD-1** Stack: Vite + Svelte 5 + TypeScript.
- **AD-2** Streaming CSV parser via `File.stream()`; BOM surfaced as a finding.
- **AD-3** Web Worker boundary; typed `Envelope` postMessage contract.
- **AD-4** Two-pass detection (column stats → cross-row rules).
- **AD-5** Single immutable state snapshot; `empty → active → processing/refusal → results → modal → building → results`.
- **AD-6** Cleaning: 5 toggles, ALL OFF by default; reversibility view required; filename pattern `cleaned-{basename}-{YYYY-MM-DD-HHmm}.csv`.
- **AD-7** Theme: CSS-variable class flip on `<html>`; `localStorage` key `wul-theme`; 180ms transition is the only motion.
- **AD-8** Visual token discipline: token names only, color reserved for semantic meaning.
- **AD-9** WCAG 2.2 AA + keyboard-first as a hard invariant.
- **AD-10** Editorial conventions: curly quotes, spaced em-dashes, mono for data only.
- **AD-11** Mechanism-B links: `aria-disabled="true"` + "(coming)", intentionally inert.
- **AD-12** Schema inference shape: typed `{columns, score, rowsParsed}` envelope.

Full text and module boundaries in `SOLUTION-DESIGN.md`.

## Build-time calls (resolved)

- **License:** MIT.
- **Test framework:** Vitest.
- **Source maps:** `hidden-source-map` in production; maps uploaded separately to a private store on the user-triggered "Report a problem" path.
- **CDN / static hosting:** Cloudflare R2 with request-body logging disabled (R2 default).

## What doesn't ship (yet)

- Mechanism-B tools (API Response Diff, JSON Surgeon) — `aria-disabled` placeholders only.
- Internationalization — English only; i18n hooks deferred.
- Hash-routing — single-page MVP. Adopt only if a second tool ships.

## Contributing

Not yet open for contributions — the implementation hasn't started. When it does, the privacy posture above is the contribution bar: a PR that adds analytics, error reporters, fonts, or remote calls at runtime will be closed without review.

## License

MIT. See `LICENSE` (to be added at implementation start).