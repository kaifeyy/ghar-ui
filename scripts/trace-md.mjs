// Generates TRACEABILITY.md from src/features/dev/traceability.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { transformSync } from 'esbuild';
const src = readFileSync('src/features/dev/traceability.ts', 'utf8');
const js = transformSync(src, { loader: 'ts', format: 'esm' }).code;
const mod = await import('data:text/javascript,' + encodeURIComponent(js));
const { TRACE, STATUS_LABEL } = mod;
const counts = {}; for (const t of TRACE) counts[t.status] = (counts[t.status] ?? 0) + 1;
let md = `# Requirement completion checklist\n\nGenerated from \`src/features/dev/traceability.ts\` (also viewable in-app: Ctrl+Shift+D → Requirements).\nTitles are short paraphrases for tracking; the PRD wording is authoritative.\n\n| Status | Count |\n|---|---|\n`;
for (const k of Object.keys(STATUS_LABEL)) md += `| ${STATUS_LABEL[k]} | ${counts[k] ?? 0} |\n`;
md += `| **Total** | **${TRACE.length}** |\n\n| ID | Requirement | Status | Where | Notes | External dependency |\n|---|---|---|---|---|---|\n`;
const esc = s => (s ?? '').replace(/\|/g, '\\|');
for (const t of TRACE) md += `| ${t.id} | ${esc(t.title)} | ${STATUS_LABEL[t.status]} | ${esc(t.where)} | ${esc(t.note)} | ${esc(t.external)} |\n`;
writeFileSync('TRACEABILITY.md', md);
console.log(TRACE.length, counts);
