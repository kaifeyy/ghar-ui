import en from './en';
import ur from './ur';
import ar from './ar';
import hi from './hi';
import { TRACE } from '@/features/dev/traceability';

const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');

describe('translation catalogues', () => {
  for (const [name, cat] of [['ur', ur], ['ar', ar], ['hi', hi]] as const) {
    it(`${name} covers every key with matching placeholders`, () => {
      for (const k of Object.keys(en) as (keyof typeof en)[]) {
        expect(cat[k], k).toBeTruthy();
        expect(ph(cat[k]), k).toBe(ph(k));
      }
    });
  }
});

describe('traceability checklist', () => {
  it('lists every PRD requirement ID exactly once', () => {
    const families: Record<string, number> = { ACC: 16, SOC: 10, FLR: 9, COM: 15, DPT: 9, MSG: 14, DIS: 3, REP: 5, BDG: 12, ADM: 11, EVT: 4, LOC: 5, DEV: 3, PAY: 8, NFR: 14 };
    const ids = TRACE.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const [f, n] of Object.entries(families))
      for (let i = 1; i <= n; i++) expect(ids).toContain(`${f}-${String(i).padStart(2, '0')}`);
    expect(ids.length).toBe(Object.values(families).reduce((a, b) => a + b, 0));
  });
});
