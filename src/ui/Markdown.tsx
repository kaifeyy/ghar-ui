import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { parseInline, type MdNode } from '@/domain/markdown';
import { useApp } from '@/state/store';
import { openModal } from '@/state/actions/ui';
import { useT } from '@/i18n';
import { ME } from '@/fixtures/users';

function scriptClass(s: string) {
  if (/[ٹڈڑںھہۃےۓچگپژ]/.test(s)) return 't-ur';
  if (/[؀-ۿ]/.test(s)) return 't-ar';
  if (/[ऀ-ॿ]/.test(s)) return 't-hi';
  return '';
}

function Spoiler({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const t = useT();
  return <button type="button" className={`spoiler ${open ? 'open' : ''}`} aria-expanded={open} aria-label={open ? undefined : t('Hidden spoiler, press to reveal')} onClick={() => setOpen(true)}>{children}</button>;
}

/** Renders user text as text. Links open through a warning dialog; custom emoji resolve against the current community. */
export function Markdown({ text, serverId }: { text: string; serverId?: string }) {
  const nodes = useMemo(() => parseInline(text), [text]);
  const users = useApp(s => s.users);
  const emoji = useApp(s => (serverId ? s.servers[serverId]?.emoji : undefined));
  const me = users[ME]!;
  const render = (n: MdNode, i: number): ReactNode => {
    switch (n.t) {
      case 'text': return <Fragment key={i}>{n.v}</Fragment>;
      case 'bold': return <strong key={i}>{n.c.map(render)}</strong>;
      case 'italic': return <em key={i}>{n.c.map(render)}</em>;
      case 'strike': return <s key={i}>{n.c.map(render)}</s>;
      case 'spoiler': return <Spoiler key={i}>{n.c.map(render)}</Spoiler>;
      case 'code': return <code key={i}>{n.v}</code>;
      case 'link': return <a key={i} href={n.href} className="mlink" onClick={e => { e.preventDefault(); openModal({ kind: 'externalLink', href: n.href }); }}>{n.label}</a>;
      case 'everyone': return <span key={i} className="mention is-me">@everyone</span>;
      case 'mention': {
        const u = Object.values(users).find(x => x.handle === n.handle);
        return <span key={i} className={`mention ${u?.id === ME || n.handle === me.handle ? 'is-me' : ''}`}>@{u ? u.name : n.handle}</span>;
      }
      case 'channel': return <span key={i} className="chanref">#{n.name}</span>;
      case 'emoji': {
        const e = emoji?.find(x => x.name === n.name);
        if (!e) return <Fragment key={i}>:{n.name}:</Fragment>;
        return e.art.kind === 'glyph' ? <span key={i} className="cemoji" role="img" aria-label={`:${e.name}:`}>{e.art.glyph}</span> : <img key={i} className="cemoji" src={e.art.url} alt={`:${e.name}:`} />;
      }
    }
  };
  return <span className={`md plain ${scriptClass(text)}`} dir="auto">{nodes.map(render)}</span>;
}
export { scriptClass };
