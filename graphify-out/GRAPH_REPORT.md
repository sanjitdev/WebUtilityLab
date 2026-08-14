# Graph Report - WebUtilityLab  (2026-08-14)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 423 nodes · 557 edges · 35 communities (32 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9e33ce9d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- audit-privacy.mjs
- columnSuppressionTokens
- compilerOptions
- render_skill.py
- settings
- config_utils.py
- r2-config.json
- scripts
- memlog.py
- devDependencies
- check-telemetry.mjs
- audit-behavior.mjs
- check-deps.mjs
- include
- known-telemetry-deps.json
- dropzone-drag-paste.test.ts
- dropzone.test.ts
- editorial-posture.test.ts
- focus-ring.test.ts
- page-chrome.test.ts
- theme-seed.test.ts
- theme-toggle.test.ts
- tokens-css.test.ts
- sum.ts
- dependency-pinning.test.ts
- MockWorker

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 19 edges
2. `RenderError` - 15 edges
3. `render()` - 13 edges
4. `scripts` - 13 edges
5. `ConfigError` - 9 edges
6. `_resolve_customization_value()` - 9 edges
7. `_resolve_replacements()` - 9 edges
8. `load_central_config()` - 9 edges
9. `load_customization()` - 9 edges
10. `load_toml()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `RenderError` --uses--> `ConfigError`  [INFERRED]
  _bmad/scripts/render_skill.py → _bmad/scripts/config_utils.py
- `render()` --calls--> `load_central_config()`  [EXTRACTED]
  _bmad/scripts/render_skill.py → _bmad/scripts/config_utils.py
- `render()` --calls--> `load_customization()`  [EXTRACTED]
  _bmad/scripts/render_skill.py → _bmad/scripts/config_utils.py
- `render()` --calls--> `load_toml()`  [EXTRACTED]
  _bmad/scripts/render_skill.py → _bmad/scripts/config_utils.py
- `measureGzipped()` --calls--> `isMapArtifact()`  [EXTRACTED]
  scripts/check-bundle-size.mjs → scripts/build-cleanup.mjs

## Import Cycles
- None detected.

## Communities (35 total, 3 thin omitted)

### Community 0 - "audit-privacy.mjs"
Cohesion: 0.07
Nodes (34): distDir, FORBIDDEN_HOSTS, FORBIDDEN_PATTERNS, FORBIDDEN_SOURCE_CALLS, here, isSourceMapArtifact(), main(), repoRoot (+26 more)

### Community 1 - "columnSuppressionTokens"
Cohesion: 0.07
Nodes (29): 378282246310005, 4111111111111111, 5555555555554444, 6011111111111117, credit-card, customer_id, email, iban (+21 more)

### Community 2 - "compilerOptions"
Cohesion: 0.07
Nodes (23): node, svelte, vite/client, target, compilerOptions, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames (+15 more)

### Community 3 - "render_skill.py"
Cohesion: 0.24
Nodes (25): _canonical_json(), _find_config_values(), _format_markdown_list(), _format_review_layers(), _hash_bytes(), _load_sources(), _lookup(), main() (+17 more)

### Community 4 - "settings"
Cohesion: 0.08
Nodes (25): how, state, verifiedAt, verifiedBy, allowedMethods, allowedOrigins, verifiedAt, policy (+17 more)

### Community 5 - "config_utils.py"
Cohesion: 0.17
Nodes (22): ConfigError, _detect_keyed_merge_field(), load_central_config(), load_customization(), load_toml(), _merge_arrays(), merge_layers(), Any (+14 more)

### Community 6 - "r2-config.json"
Cohesion: 0.08
Nodes (23): bucket, name, region, purpose, $schema, schemaLocked, schemaNote, verification (+15 more)

### Community 7 - "scripts"
Cohesion: 0.09
Nodes (21): description, engines, node, license, name, private, scripts, audit:all (+13 more)

### Community 8 - "memlog.py"
Cohesion: 0.21
Nodes (20): ack(), add_target(), cmd_append(), cmd_init(), cmd_set(), entry_count(), main(), now() (+12 more)

### Community 9 - "devDependencies"
Cohesion: 0.10
Nodes (21): devDependencies, playwright, svelte, svelte-check, @sveltejs/vite-plugin-svelte, @tsconfig/svelte, @types/node, typescript (+13 more)

### Community 10 - "check-telemetry.mjs"
Cohesion: 0.14
Nodes (18): checkVersionConstraints(), FETCH_HOST_REGEX, FORBIDDEN_HOSTS, formatReport(), here, HOST_FRAGMENTS, listSourceFiles(), nodeModulesDir (+10 more)

### Community 11 - "audit-behavior.mjs"
Cohesion: 0.17
Nodes (14): allowlistPath, describeRequest(), distDir, findFreePort(), here, isAllowed(), loadAllowlist(), main() (+6 more)

### Community 12 - "check-deps.mjs"
Cohesion: 0.23
Nodes (13): denyListPath, findDenylisted(), formatReport(), here, main(), parseAllowFlags(), parseDenyList(), parseVersionConstraints() (+5 more)

### Community 13 - "include"
Cohesion: 0.15
Nodes (12): dist, node_modules, scripts/**/*.d.mts, scripts/**/*.mjs, src/**/*.svelte, src/**/*.ts, tests/**/*.ts, @tsconfig/svelte/tsconfig.json (+4 more)

### Community 14 - "known-telemetry-deps.json"
Cohesion: 0.17
Nodes (11): A blocked package that is genuinely needed for MVP scope must be approved in a dedicated PR with rationale in the `alternatives` field, or replaced with a non-blocked alternative., Pattern matching is glob-style: `@scope/*` matches any package in that scope; bare names match exact package names., The denylist does not cover build-time dev tooling (Playwright, Vitest, etc.) which legitimately make network calls during install or test runs. The Privacy Baseline covers runtime, not build-time., The denylist is intentionally aggressive — false positives (a blocked package that's actually safe) are cheaper than false negatives (a package that ships telemetry slipping through)., notes, packages, purpose, reviewCadence (+3 more)

### Community 15 - "dropzone-drag-paste.test.ts"
Cohesion: 0.20
Nodes (9): appPath, dropzonePath, dropzoneTestPath, editorialPostureTestPath, focusRingTestPath, here, pageChromeTestPath, repoRoot (+1 more)

### Community 16 - "dropzone.test.ts"
Cohesion: 0.20
Nodes (9): appPath, dropzonePath, editorialPostureTestPath, focusRingTestPath, here, pageChromeTestPath, NOTE: the prior pin `Dropzone.svelte does NOT contain onMount(…)`, repoRoot (+1 more)

### Community 17 - "editorial-posture.test.ts"
Cohesion: 0.20
Nodes (7): appPath, distIndexHtmlPath, here, indexHtmlPath, repoRoot, srcDir, tokensPath

### Community 18 - "focus-ring.test.ts"
Cohesion: 0.22
Nodes (7): appPath, here, pageChromeTestPath, repoRoot, seedTestPath, srcDir, tokensPath

### Community 19 - "page-chrome.test.ts"
Cohesion: 0.29
Nodes (6): appPath, cssPath, here, repoRoot, seedTestPath, togglePath

### Community 20 - "theme-seed.test.ts"
Cohesion: 0.40
Nodes (3): here, indexPath, repoRoot

### Community 21 - "theme-toggle.test.ts"
Cohesion: 0.40
Nodes (4): here, repoRoot, seedTestPath, togglePath

### Community 22 - "tokens-css.test.ts"
Cohesion: 0.40
Nodes (4): here, repoRoot, srcDir, tokensPath

## Knowledge Gaps
- **216 isolated node(s):** `distDir`, `FORBIDDEN_HOSTS`, `FORBIDDEN_PATTERNS`, `FORBIDDEN_SOURCE_CALLS`, `here` (+211 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `settings` connect `settings` to `r2-config.json`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `compilerOptions` connect `compilerOptions` to `include`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `scripts`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `distDir`, `FORBIDDEN_HOSTS`, `FORBIDDEN_PATTERNS` to the rest of the system?**
  _216 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `audit-privacy.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.06659619450317125 - nodes in this community are weakly interconnected._
- **Should `columnSuppressionTokens` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._