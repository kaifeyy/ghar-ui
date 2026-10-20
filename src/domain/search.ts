/** Small typo-tolerant matcher used by settings search, user search and the quick switcher. */
export const fold = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').trim();

function editDistanceAtMost1(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a[i + 1] === b[j] && a[i] === b[j + 1]) { i += 2; j += 2; continue; } // transposition
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/** Returns a score > 0 when every query word matches some field word (prefix, substring or one typo). */
export function matchScore(query: string, fields: readonly string[]): number {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return 0;
  const hay = fields.map(fold);
  const tokens = hay.flatMap(f => f.split(/[\s/&,·.()_-]+/)).filter(Boolean);
  let total = 0;
  for (const w of words) {
    let best = 0;
    if (hay[0] && hay[0].startsWith(w)) best = 10;
    for (const t of tokens) {
      if (t === w) best = Math.max(best, 8);
      else if (t.startsWith(w)) best = Math.max(best, 6);
      else if (w.length >= 4 && editDistanceAtMost1(w, t.slice(0, w.length + 1)) ) best = Math.max(best, 3);
      else if (w.length >= 4 && editDistanceAtMost1(w, t)) best = Math.max(best, 3);
    }
    if (!best && hay.some(f => f.includes(w))) best = 2;
    if (!best) return 0;
    total += best;
  }
  return total;
}
