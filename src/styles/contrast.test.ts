import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { contrast } from '@/domain/contrast';

const css = readFileSync(resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8');
function block(selector: string): Record<string, string> {
  const i = css.indexOf(selector + ' {');
  const body = css.slice(i, css.indexOf('}', i));
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{6})/g)].map(m => [m[1]!, m[2]!]));
}
const themes = { dark: block(':root'), light: { ...block(':root'), ...block(':root[data-theme="light"]') } };

describe.each(Object.entries(themes))('%s palette contrast (actual combinations)', (_, p) => {
  const surfaces = ['canvas', 'nav', 'main', 'raise', 'hover', 'sel', 'well'];
  it.each(surfaces)('text tokens ≥ 4.5:1 on %s', s => {
    for (const t of ['tx', 'tx-2', 'tx-3']) expect(contrast(p[t]!, p[s]!), `${t} on ${s}`).toBeGreaterThanOrEqual(4.5);
  });
  it('status and accent colours readable as text on main/raise/nav', () => {
    for (const c of ['green', 'danger', 'amber', 'idle', 'info']) for (const s of ['main', 'raise', 'nav']) expect(contrast(p[c]!, p[s]!), `${c} on ${s}`).toBeGreaterThanOrEqual(4.5);
  });
  it('primary button text', () => { expect(contrast(p['pri-ink']!, p.pri!)).toBeGreaterThanOrEqual(4.5); });
  it('essential control boundary ≥ 3:1 against surfaces', () => {
    for (const s of ['main', 'raise', 'nav', 'well']) expect(contrast(p.edge!, p[s]!), `edge on ${s}`).toBeGreaterThanOrEqual(3);
  });
  it('focus ring ≥ 3:1', () => { for (const s of ['main', 'nav', 'raise']) expect(contrast(p.focus!, p[s]!)).toBeGreaterThanOrEqual(3); });
});
