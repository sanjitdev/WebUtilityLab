"""Generate semantic-augmented report from the merged graph."""
import json
from pathlib import Path
from collections import defaultdict, Counter

g = json.loads(Path('graphify-out/graph.json').read_text(encoding='utf-8'))
nodes = g['nodes']
links = g['links']
node_ids = {n['id']: n for n in nodes}

# Stats
n_nodes = len(nodes)
n_links = len(links)
ast_nodes = sum(1 for n in nodes if n.get('_origin') == 'ast')
sem_nodes = sum(1 for n in nodes if n.get('_origin') == 'semantic')
ast_links = sum(1 for l in links if l.get('_origin') == 'ast')
sem_links = sum(1 for l in links if l.get('_origin') == 'semantic')

# Hubs (in-degree)
in_degree = Counter()
out_degree = Counter()
for link in links:
    s, t = link.get('source'), link.get('target')
    if s in node_ids:
        out_degree[s] += 1
    if t in node_ids:
        in_degree[t] += 1

top_hubs = []
for nid, deg in in_degree.most_common(20):
    n = node_ids[nid]
    top_hubs.append((nid, deg, n.get('label', '')[:40], n.get('_origin', '?'), n.get('kind', '?')))

# Strong semantic edges
strong_edges = []
for link in links:
    if link.get('_origin') == 'semantic' and link.get('evidence'):
        strong_edges.append({
            'source': link.get('source'),
            'target': link.get('target'),
            'relation': link.get('relation'),
            'confidence': link.get('confidence'),
            'evidence': (link.get('evidence') or '')[:120],
        })

# Build markdown
lines = []
lines.append('# Graph Report - WebUtilityLab (semantic + AST)  2026-08-14')
lines.append('')
lines.append('## Summary')
lines.append('')
lines.append(f'- **{n_nodes} nodes** ({ast_nodes} AST + {sem_nodes} semantic)')
lines.append(f'- **{n_links} links** ({ast_links} AST + {sem_links} semantic)')
lines.append('- Built from commit: `9e33ce9d`')
lines.append('- Pipeline: AST extraction (no LLM) + 3-subagent semantic extraction (planning artifacts, implementation artifacts, top-level docs)')
lines.append('')
lines.append('## Top God Nodes (semantic anchors)')
lines.append('')
for nid, deg, label, origin, kind in top_hubs[:15]:
    lines.append(f'- `{nid}` -- {label} -- {deg} in-edges  [{origin}/{kind}]')
lines.append('')
lines.append('## Strong Semantic Edges (with evidence)')
lines.append('')
for e in strong_edges[:25]:
    lines.append(f'- `{e["source"]}` --{e["relation"]}--> `{e["target"]}` [{e["confidence"]}] -- {e["evidence"]}')
lines.append('')
lines.append('## Node Kinds (semantic)')
lines.append('')
kinds = Counter(n.get('kind', '?') for n in nodes if n.get('_origin') == 'semantic')
for k, c in kinds.most_common():
    lines.append(f'- {k}: {c}')
lines.append('')
lines.append('## Knowledge Gaps')
lines.append('')
weak = [n for n in nodes if n.get('_origin') == 'semantic' and (in_degree.get(n['id'], 0) + out_degree.get(n['id'], 0)) < 2]
lines.append(f'- {len(weak)} semantic nodes with <=1 link -- possible missing edges or thin forward-references')
lines.append('')
lines.append('## How to use this graph')
lines.append('')
lines.append('Open `graph.html` in a browser to explore interactively (zoom, filter, search).')
lines.append('Query the graph:')
lines.append('  graphify query "Where does Dropzone.svelte get its onaccept payload?"')
lines.append('  graphify explain "ad-1"')
lines.append('  graphify path "dropzone.svelte" "audit-privacy.mjs"')
lines.append('')

md = '\n'.join(lines)
Path('graphify-out/SEMANTIC_REPORT.md').write_text(md, encoding='utf-8')
print(f'Wrote {len(md)} chars to graphify-out/SEMANTIC_REPORT.md')
