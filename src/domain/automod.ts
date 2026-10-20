export type AutomodAction = 'delete' | 'warn' | 'timeout' | 'kick' | 'ban' | 'alert';
export interface AutomodConfig {
  words: string[]; // any script, incl. Roman Urdu
  wordAction: AutomodAction;
  blockLinks: boolean;
  allowedHosts: string[];
  blockInvites: boolean;
  mentionLimit: number; // 0 = off
  spamRepeat: number; // same text N times in a row, 0 = off
  raidJoinsPerMinute: number;
  linkAction: AutomodAction;
  spamAction: AutomodAction;
}
export interface Violation { rule: 'word' | 'link' | 'invite' | 'mentions' | 'spam'; action: AutomodAction; detail: string }

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's' };
export const normalizeForFilter = (s: string) => s.toLowerCase().replace(/[0134@57$]/g, c => LEET[c] ?? c).replace(/(.)\1{2,}/g, '$1$1');

export function evaluate(text: string, cfg: AutomodConfig, recentSameAuthor: readonly string[] = []): Violation[] {
  const v: Violation[] = [];
  const norm = normalizeForFilter(text);
  for (const w of cfg.words) {
    const nw = normalizeForFilter(w.trim());
    if (nw && norm.includes(nw)) { v.push({ rule: 'word', action: cfg.wordAction, detail: w }); break; }
  }
  if (cfg.blockInvites && /(ghar\.gg\/|discord\.gg\/|chat\.whatsapp\.com\/)/i.test(text)) v.push({ rule: 'invite', action: cfg.linkAction, detail: 'invite link' });
  else if (cfg.blockLinks) {
    const hosts = [...text.matchAll(/https?:\/\/([^/\s]+)/gi)].map(m => m[1]!.toLowerCase());
    const bad = hosts.find(h => !cfg.allowedHosts.some(a => h === a || h.endsWith('.' + a)));
    if (bad) v.push({ rule: 'link', action: cfg.linkAction, detail: bad });
  }
  const mentions = (text.match(/@[a-z0-9_.]{3,32}/gi) ?? []).length;
  if (cfg.mentionLimit > 0 && mentions > cfg.mentionLimit) v.push({ rule: 'mentions', action: cfg.spamAction, detail: `${mentions} mentions` });
  if (cfg.spamRepeat > 0) {
    const same = [text, ...recentSameAuthor].slice(0, cfg.spamRepeat).filter(t => t.trim() === text.trim()).length;
    if (same >= cfg.spamRepeat) v.push({ rule: 'spam', action: cfg.spamAction, detail: `repeated ${same}×` });
  }
  return v;
}
