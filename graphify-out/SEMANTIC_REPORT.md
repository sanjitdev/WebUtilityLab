# Graph Report - WebUtilityLab (semantic + AST)  2026-08-14

## Summary

- **1957 nodes** (1464 AST + 493 semantic)
- **2030 links** (1678 AST + 352 semantic)
- Built from commit: `9e33ce9d`
- Pipeline: AST extraction (no LLM) + 3-subagent semantic extraction (planning artifacts, implementation artifacts, top-level docs)

## Top God Nodes (semantic anchors)

- `bmad_scripts_render_skill_rendererror` -- RenderError -- 13 in-edges  [ast/?]
- `story-S03.2` -- S03.2 Drag-and-drop handler + paste hand -- 13 in-edges  [semantic/story]
- `bmad_scripts_render_skill_py_any` -- Any -- 12 in-edges  [ast/?]
- `bmad_scripts_render_skill_py_path` -- Path -- 12 in-edges  [ast/?]
- `bmad_scripts_config_utils_configerror` -- ConfigError -- 8 in-edges  [ast/?]
- `ad-9` -- AD-9 Accessibility contract (WCAG 2.2 AA -- 8 in-edges  [semantic/architecture-decision]
- `bmad_scripts_config_utils_py_any` -- Any -- 7 in-edges  [ast/?]
- `bmad_scripts_config_utils_load_toml` -- load_toml() -- 6 in-edges  [ast/?]
- `scripts_audit_privacy_ismainentry` -- isMainEntry() -- 6 in-edges  [ast/?]
- `scripts_build_cleanup_ismapartifact` -- isMapArtifact() -- 6 in-edges  [ast/?]
- `ad-10` -- AD-10 Editorial conventions (curly quote -- 6 in-edges  [semantic/architecture-decision]
- `story-S03.1` -- S03.1 Real <button> dropzone (AD-9 — no  -- 6 in-edges  [semantic/story]
- `file-package.json` -- package.json -- 6 in-edges  [semantic/config]
- `bmad_scripts_config_utils_load_central_config` -- load_central_config() -- 5 in-edges  [ast/?]
- `bmad_scripts_config_utils_load_customization` -- load_customization() -- 5 in-edges  [ast/?]

## Strong Semantic Edges (with evidence)

- `state-empty` --transition--> `state-active` [EXTRACTED] -- empty --> active: file accepted (mermaid state diagram line 148).
- `state-active` --transition--> `state-processing` [EXTRACTED] -- active --> processing: estimate ≤ 10s (line 149).
- `state-active` --transition--> `state-refusal` [EXTRACTED] -- active --> refusal: estimate > 10s (line 150).
- `state-processing` --transition--> `state-refusal` [EXTRACTED] -- processing --> refusal: budget exceeded mid-run (line 151).
- `state-processing` --transition--> `state-results` [EXTRACTED] -- processing --> results: analysis complete (line 152).
- `state-processing` --transition--> `state-empty` [EXTRACTED] -- processing --> empty: cancel / re-drop (line 153).
- `state-refusal` --transition--> `state-empty` [EXTRACTED] -- refusal --> empty: Choose a smaller file (line 154).
- `state-results` --transition--> `state-modal-open` [EXTRACTED] -- results --> modal_open: Clean & export (line 155).
- `state-modal-open` --transition--> `state-results` [EXTRACTED] -- modal_open --> results: Cancel / Esc (line 156).
- `state-modal-open` --transition--> `state-building` [EXTRACTED] -- modal_open --> building: Confirm (line 157).
- `state-building` --transition--> `state-results` [EXTRACTED] -- building --> results: download fires (line 158).
- `state-results` --transition--> `state-empty` [EXTRACTED] -- results --> empty: Start over (line 159).
- `ad-3` --defines--> `envelope-estimate` [EXTRACTED] -- Worker contract is one typed envelope with phase: 'estimate'|'progress'|'partial'|'refusal'|'results'|'cleaned' (line 55
- `ad-3` --defines--> `envelope-progress` [EXTRACTED] -- Envelope union includes 'progress' phase (line 55).
- `ad-3` --defines--> `envelope-partial` [EXTRACTED] -- Envelope union includes 'partial' phase (line 55).
- `ad-3` --defines--> `envelope-refusal` [EXTRACTED] -- Envelope union includes 'refusal' phase (line 55).
- `ad-3` --defines--> `envelope-results` [EXTRACTED] -- Envelope union includes 'results' phase (line 55).
- `ad-3` --defines--> `envelope-cleaned` [EXTRACTED] -- Envelope union includes 'cleaned' phase (line 55).
- `ad-12` --extends--> `envelope-results` [EXTRACTED] -- AD-12 schema shape is part of results envelope payload (lines 167-171).
- `ad-6` --defines--> `envelope-cleaned` [EXTRACTED] -- AD-6 cleaning flow ends in cleaned envelope with blob and basename (lines 71).
- `module-worker-index` --imports--> `module-worker-parser` [EXTRACTED] -- src/worker/index.ts may import worker/parser, worker/stats, worker/detect, worker/schema, worker/clean, lib/types (line 
- `module-worker-index` --imports--> `module-worker-stats` [EXTRACTED] -- Worker entry routes to subs (line 78).
- `module-worker-index` --imports--> `module-worker-detect` [EXTRACTED] -- Worker entry routes to subs (line 78).
- `module-worker-index` --imports--> `module-worker-schema` [EXTRACTED] -- Worker entry routes to subs (line 78).
- `module-worker-index` --imports--> `module-worker-clean` [EXTRACTED] -- Worker entry routes to subs (line 78).

## Node Kinds (semantic)

- story: 120
- functional-requirement: 28
- epic: 26
- test: 24
- decision: 18
- privacy-gate: 17
- design-token: 15
- process: 15
- module: 14
- constraint: 14
- deferred: 13
- config: 13
- architecture-decision: 12
- action: 11
- edit: 10
- envelope: 8
- state: 7
- critical-discovery: 7
- craft-practice: 7
- definition-of-done: 7
- gate: 7
- pattern: 7
- open-question: 6
- ux-surface: 6
- build-time-call: 5
- toggle: 5
- script: 5
- fact: 5
- ux-state: 5
- risk-accepted: 4
- design-system: 4
- principle: 4
- success-metric: 3
- counter-metric: 3
- component: 3
- doc: 3
- policy: 3
- rule: 3
- discovery: 3
- type: 2
- ux-invariants: 2
- ux-locked-copy: 2
- retrospective: 2
- stylesheet: 2
- feature: 2
- threat: 2
- user-journey: 1
- invariant: 1
- context: 1
- function: 1
- persona: 1
- data: 1
- convention: 1
- risk: 1
- plan: 1

## Knowledge Gaps

- 353 semantic nodes with <=1 link -- possible missing edges or thin forward-references

## How to use this graph

Open `graph.html` in a browser to explore interactively (zoom, filter, search).
Query the graph:
  graphify query "Where does Dropzone.svelte get its onaccept payload?"
  graphify explain "ad-1"
  graphify path "dropzone.svelte" "audit-privacy.mjs"
