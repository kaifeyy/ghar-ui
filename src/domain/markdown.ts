// Safe, minimal markdown → AST. Never produces HTML strings; the renderer maps nodes to React elements.
export type MdNode =
  | { t: 'text'; v: string }
  | { t: 'bold' | 'italic' | 'strike' | 'spoiler'; c: MdNode[] }
  | { t: 'code'; v: string }
  | { t: 'link'; href: string; label: string }
  | { t: 'mention'; handle: string }
  | { t: 'everyone' }
  | { t: 'channel'; name: string }
  | { t: 'emoji'; name: string };

/** Only absolute http(s) URLs without credentials are linkified. */
export function safeUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    if (u.username || u.password) return null;
    return u.toString();
  } catch { return null; }
}

const INLINE: { re: RegExp; boundary?: boolean; make: (m: RegExpExecArray) => MdNode | null }[] = [
  { re: /`([^`\n]+)`/y, make: m => ({ t: 'code', v: m[1]! }) },
  { re: /\*\*([^*\n]+)\*\*/y, make: m => ({ t: 'bold', c: parseInline(m[1]!) }) },
  { re: /\|\|([^|\n]+)\|\|/y, make: m => ({ t: 'spoiler', c: parseInline(m[1]!) }) },
  { re: /~~([^~\n]+)~~/y, make: m => ({ t: 'strike', c: parseInline(m[1]!) }) },
  { re: /(?:\*|_)([^*_\n]+)(?:\*|_)/y, make: m => ({ t: 'italic', c: parseInline(m[1]!) }) },
  { boundary: true, re: /https?:\/\/[^\s<>()]+[^\s<>().,!?;:'"]/y, make: m => { const href = safeUrl(m[0]); return href ? { t: 'link', href, label: m[0] } : null; } },
  { boundary: true, re: /@everyone\b/y, make: () => ({ t: 'everyone' }) },
  { boundary: true, re: /@([a-z0-9_.]{3,32})/y, make: m => ({ t: 'mention', handle: m[1]!.replace(/\.$/, '') }) },
  { boundary: true, re: /#([a-z0-9-]{2,32})/y, make: m => ({ t: 'channel', name: m[1]! }) },
  { boundary: true, re: /:([a-z0-9_]{2,32}):/y, make: m => ({ t: 'emoji', name: m[1]! }) },
];

export function parseInline(src: string): MdNode[] {
  const out: MdNode[] = [];
  let buf = '';
  let i = 0;
  const flush = () => { if (buf) { out.push({ t: 'text', v: buf }); buf = ''; } };
  outer: while (i < src.length) {
    const prev = i > 0 ? src[i - 1]! : ' ';
    for (const r of INLINE) {
      // mentions/emoji/links only start at a word boundary
      if (r.boundary && /\w/.test(prev)) continue;
      r.re.lastIndex = i;
      const m = r.re.exec(src);
      if (m && m.index === i) {
        const node = r.make(m);
        if (node) { flush(); out.push(node); i += m[0].length; continue outer; }
      }
    }
    buf += src[i];
    i += 1;
  }
  flush();
  return out;
}

export function plainText(nodes: MdNode[]): string {
  return nodes.map(n => ('v' in n ? n.v : 'c' in n ? plainText(n.c) : n.t === 'link' ? n.label : n.t === 'mention' ? '@' + n.handle : n.t === 'everyone' ? '@everyone' : n.t === 'channel' ? '#' + n.name : ':' + n.name + ':')).join('');
}
