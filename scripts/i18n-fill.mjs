// Appends keys missing from ur/ar/hi as English placeholders marked /*pending*/,
// so the app typechecks while translations are produced. `--list` prints pending counts.
import { readFileSync, writeFileSync } from 'node:fs';
const en = readFileSync('src/i18n/en.ts', 'utf8');
const keys = [...en.matchAll(/^  ('(?:[^'\\]|\\.)*'): /gm)].map(m => m[1]);
for (const lang of ['ur', 'ar', 'hi']) {
  const p = `src/i18n/${lang}.ts`;
  let s = readFileSync(p, 'utf8');
  const have = new Set([...s.matchAll(/^  ('(?:[^'\\]|\\.)*'): /gm)].map(m => m[1]));
  // drop entries whose key no longer exists in en
  const enSet = new Set(keys);
  s = s.split('\n').filter(l => { const m = /^  ('(?:[^'\\]|\\.)*'): /.exec(l); return !m || enSet.has(m[1]); }).join('\n');
  const missing = keys.filter(k => !have.has(k));
  if (missing.length) s = s.replace('\n} satisfies', '\n' + missing.map(k => `  ${k}: ${k}, /*pending*/`).join('\n') + '\n} satisfies');
  writeFileSync(p, s);
  console.log(lang, 'added', missing.length, 'pending total', (s.match(/\/\*pending\*\//g) ?? []).length);
}
