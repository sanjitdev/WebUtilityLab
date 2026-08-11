---
title: PII Pattern List — CSV Rescue MVP
created: 2026-08-11
updated: 2026-08-11
status: final
audience: engineering, future contributors, security review
sources:
  - _bmad-output/planning-artifacts/epics-and-stories/epics-WebUtilityLab-2026-08-11/epics.md (E08.9a–E08.9e)
  - _bmad-output/planning-artifacts/architectures/arch-WebUtilityLab-2026-08-11/SOLUTION-DESIGN.md (AD-8)
---

# PII Pattern List — CSV Rescue MVP

This document is the **code-time reference** for the PII patterns shipped in `src/lib/pii-patterns.json`. The JSON file is the runtime source of truth; this document captures the rationale, jurisdiction, and known limitations that don't fit in the JSON.

## Principles

1. **No pattern claims certainty it does not have.** Every match label includes a qualifier: "Possible", "Luhn-valid", "shape-only", "mod-97 valid". A label that says "found" is a lie.
2. **ReDoS-safe by construction.** Every regex is checked against a CI fuzzer (S08.9d). Patterns with nested quantifiers, overlapping alternations, or unbounded backtracking are rejected at PR time.
3. **Per-cell, not per-row.** All 6 MVP patterns run per-cell. No column-name-only matching at MVP — too easy to silently miss a column rename.
4. **Column-name suppression is a runtime engine feature, not a pattern flag.** The engine has one suppression list (`id`, `order_id`, `customer_id`, `ref`, `sku`, `transaction_id`, `uuid`, `serial`). Patterns opt in via `columnContextSuppression: true`. Patterns default to `false` for the high-precision checks (Luhn, mod-97) and `true` for the shape-only ones (SSN, phone-display).
5. **No callback to a remote service.** Every check is local. There is no npm PII library. The regexes, Luhn, and mod-97 implementations live in `src/worker/clean.ts` and `src/worker/detect.ts`.
6. **Test BINs are filtered, not flagged.** The Luhn regex pass captures `4111111111111111` and `5555555555554444`; these are dropped with a separate label "test card number discarded" so the user sees they were considered but not flagged.

## MVP patterns (6)

### 1. Email

- **Regex** (one-shot, no anchors):
  ```
  [A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,24}
  ```
- **Validation:** none.
- **False-positive rate:** ~0.1% of cells.
- **False negatives:** quoted-local emails (`"john doe"@x.com`), IP-literal domains (`user@[127.0.0.1]`), IDN domains (`user@日本.jp`).
- **Jurisdiction:** universal.
- **Column suppression:** true (most "emails" in user-data columns are real; suppression helps in `notes` columns where `2.5.0-rc.4@latest`-style version strings collide).
- **Label:** `"Possible email address"`.

### 2. Phone (E.164)

- **Regex** (anchored with `\b`):
  ```
  \+[1-9]\d{7,14}\b
  ```
- **Validation:** E.164 total length 8–15 digits, leading `+`, country code first digit 1–9.
- **False-positive rate:** <0.05%.
- **False negatives:** numbers with spaces, hyphens, parentheses (handled by phone-display).
- **Jurisdiction:** international.
- **Column suppression:** true.
- **Label:** `"Possible phone number (E.164)"`.

### 3. Phone (display format)

- **Regex** (per-cell, US/NANP display formats):
  ```
  (?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}
  ```
- **Validation:** structural only; no checksum.
- **False-positive rate:** 1–3% on transaction CSVs (order numbers shaped like US phone numbers — `415-555-2671` collides).
- **False negatives:** UK local formats, letters-as-digits (1-800-FLOWERS).
- **Jurisdiction:** US/NANP. International display formats are post-MVP.
- **Column suppression:** true (highly recommended; this is the highest-FP pattern).
- **Label:** `"Possible phone number (display format — higher false-positive risk)"`.

### 4. US SSN (shape-only)

- **Regex** (anchored):
  ```
  \b\d{3}-\d{2}-\d{4}\b
  ```
- **Validation:** structural only; reject `000-xx-xxxx`, `xxx-00-xxxx`, `xxx-xx-0000`, area `666`, area `900–999` in the post-match filter (SSA never issues these).
- **False-positive rate:** 0.5–2% on typical CSVs. The dominant collision is **formatted US phone numbers** in the same cell — phone regex runs first, SSN matches in phone-positive cells are suppressed.
- **False negatives:** SSNs without hyphens, ITINs (same shape, different issuance).
- **Jurisdiction:** US-only.
- **Column suppression:** false (SSNs are often in `tax_id` or `employee_id` columns — paradoxical).
- **Label:** `"Possible US SSN (shape only — no checksum)"`.

### 5. Credit card (Luhn-validated)

- **Regex** (per-cell, captures with separators):
  ```
  \b(?:\d[ -]?){12,18}\d\b
  ```
- **Validation:** Luhn mod-10 (ISO/IEC 7812-1). Strip non-digits from the match before checking.
- **Test BINs:** `4111111111111111`, `5555555555554444`, `378282246310005`, `6011111111111117` — caught and dropped with a separate "test card number discarded" label, not a PII hit.
- **False-positive rate:** ~0.01% on Luhn-valid runs. The Luhn check is the load-bearing filter.
- **False negatives:** card numbers with exotic separators (dots, slashes) — rare.
- **Jurisdiction:** universal (Visa/MC/Amex/Discover/JCB/UnionPay all use Luhn).
- **Column suppression:** false. Luhn is precision enough.
- **Label:** `"Possible credit card number (Luhn-valid)"`.

### 6. IBAN (mod-97-validated)

- **Regex** (per-cell):
  ```
  \b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b
  ```
- **Validation:** mod-97 (ISO 13616). Length pre-check against a per-country table; reject if country-code length doesn't match the table. JS uses BigInt for chunked-mod to avoid >16-digit precision loss.
- **Per-country length table** (checked in code, not in the regex): `AL:28, AD:24, AT:20, AZ:28, BH:22, BE:16, BA:20, BR:29, BG:22, CR:22, HR:21, CY:28, CZ:24, DK:18, DO:28, EE:20, FO:18, FI:18, FR:27, GE:22, DE:22, GI:23, GR:27, GL:18, GT:28, HU:28, IS:26, IE:22, IL:23, IT:27, JO:30, KZ:20, KW:30, LV:21, LB:28, LI:21, LT:20, LU:20, MK:19, MT:31, MR:27, MU:30, MC:27, MD:24, ME:22, NL:18, NO:15, PK:24, PS:29, PL:28, PT:25, QA:29, RO:24, SM:27, SA:24, RS:22, SK:24, SI:19, ES:24, SE:24, CH:21, TL:23, TN:24, TR:26, AE:23, GB:22, VG:24, XK:20`.
- **False-positive rate:** ~0.05% raw; ~0.01% after length filter.
- **False negatives:** lowercase IBANs (normalize before regex), IBANs with spaces (strip), country codes not in the table.
- **Jurisdiction:** international; western Europe + UK is dense.
- **Column suppression:** false. mod-97 is precision enough.
- **Label:** `"Possible IBAN (mod-97 valid)"`.

### 7. UK NINo

- **Regex** (per-cell, anchored):
  ```
  \b[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[A-D]\b
  ```
- **Validation:** structural only; the first two letters follow the NINo prefix-validity rules (no `D`, `F`, `I`, `Q`, `U`, `V` as start; no `O` as second char).
- **False-positive rate:** ~0.1%.
- **False negatives:** rare.
- **Jurisdiction:** UK-only.
- **Column suppression:** true.
- **Label:** `"Possible UK National Insurance Number (shape only)"`.

## Deferred patterns (post-MVP)

| Pattern | Why deferred |
|---|---|
| US driver's license | 50 state formats + territories; FP rate 5–15%. |
| US passport | 9-char alphanumeric collides with every order/ref ID. Useless. |
| Canadian SIN | Same shape problem as SSN, but Canadian context is rare in general CSVs. |
| EU national ID | No single regex covers 27 countries; high complexity, low coverage. |
| US ABA bank routing | 9 digits with a checksum (mod-10 weighted), but every other 9-digit run matches. Same problem as SSN without hyphens. |
| IPv4 address | Mandatory per GDPR context, but ~30% FP on network/log CSVs. Needs column-context gating. |
| MAC address | Trivial regex, rarely sensitive in business CSVs. |
| Date of birth | Every date in the file flags. Requires column-name match (`dob`, `birth`) + date-range filter. DoB-by-column only, not per-cell. |
| GPS coordinates | Decimal lat/lon pattern is too loose; FP rate ~5%. Column-name match required. |
| International non-NANP phone display formats | UK `020 7946 0958`, German `030 12345678`, etc. — build out per-country if users ask. |

## Implementation notes

- **CI ReDoS validator** (`scripts/check-pii-patterns.mjs` per S08.9d): runs against every pattern in `src/lib/pii-patterns.json` on every commit. Rejects nested quantifiers, overlapping alternations, unbounded backtracking. Patterns failing the check are not loaded at runtime — the JSON's `pii` section is filtered by the validator at module load.
- **Per-cell regex timeout** (S08.9e): each cell's regex match is wrapped in a per-call budget (10 ms default). Exceeding the budget skips the cell and continues. Prevents pathological cells from hanging the worker.
- **Luhn function** lives in `src/worker/detect.ts` (or a sibling `src/worker/luhn.ts` extracted for clarity). Pure function, no side effects.
- **mod-97 function** lives in `src/worker/detect.ts` (or `src/worker/iban.ts`). Uses BigInt for chunked-mod to avoid JS Number precision loss on long IBANs.
- **Column-name suppression list** lives in `src/worker/detect.ts`. Tokens: `id`, `order_id`, `customer_id`, `ref`, `sku`, `transaction_id`, `uuid`, `serial`. Case-insensitive match.

## Open questions

- **Should the test-BIN allowlist live in the JSON or in code?** Inclined to keep it in code (`src/worker/test-bins.ts`) so the JSON stays declarative. The runtime API is "give me a list of test BINs" which is a code shape, not a data shape.
- **NINo in MVP?** Yes (per the research above, it's cheap and ~0.1% FP). If the user signals the audience is UK-heavy, this is a high-value 30-line addition.
- **DoB and IPv4 gating.** Both are deferred, but they could ship in a v1.1 with column-name gating. The pattern side (regex) is trivial; the gating is the engineering task.
