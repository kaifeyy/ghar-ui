import { dmWith } from '@/state/actions/social';
import { startCall } from '@/state/actions/calls';
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { SmilePlus, Reply, MessagesSquare, MoreHorizontal, Pencil, Copy, Pin, Flag, Trash2, Download, Play, Pause, FileText, AlertCircle, Clock, RotateCw, X, CornerUpLeft, Link2, ShieldAlert, User, MessageSquare, Phone } from 'lucide-react';
import type { Message } from '@/types/models';
import { useApp, update } from '@/state/store';
import { canManage } from '@/state/selectors';
import { react, remove, retry, discardFailed, setReply, togglePin, openThread, type MsgKey, keyStr } from '@/state/actions/messages';
import { openModal, go, toast } from '@/state/actions/ui';
import { download } from '@/state/actions/auth';
import { removeMessageAsModerator } from '@/state/actions/portal';
import { useT, useLocale, plural } from '@/i18n';
import { formatKarachi, karachiDay, MIN } from '@/domain/time';
import { clock } from '@/domain/format';
import { Avatar } from '@/ui/Avatar';
import { Art } from '@/ui/Art';
import { Markdown } from '@/ui/Markdown';
import { Button, IconButton } from '@/ui/Button';
import { Menu, useMenu, type MenuItem } from '@/ui/Overlay';
import { Tag } from '@/ui/Misc';
import { ME, TITLES } from '@/fixtures/users';

export const QUICK_REACTIONS = ['👍', '❤️', '😂', '🔥', '🎉', '😮', '😢', '🙏'];
const PAGE = 50;

export function RoleName({ userId, serverId }: { userId: string; serverId?: string }) {
  const name = useApp(s => s.users[userId]?.name ?? userId);
  const role = useApp(s => {
    if (!serverId) return undefined;
    const sv = s.servers[serverId];
    const m = sv?.memberList.find(x => x.userId === userId);
    return sv?.roles.filter(r => m?.roleIds.includes(r.id) && !r.system).sort((a, b) => a.position - b.position)[0];
  });
  const style = role ? (role.color2 ? { backgroundImage: `linear-gradient(90deg, ${role.color1}, ${role.color2})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' } : { color: role.color1 }) : undefined;
  return <b className="mname" style={style} dir="auto">{name}</b>;
}

function TimeStamp({ at, short }: { at: number; short?: boolean }) {
  const locale = useLocale();
  const now = useApp(s => s.now);
  const today = karachiDay(at) === karachiDay(now);
  const full = formatKarachi(at, { dateStyle: 'medium', timeStyle: 'short' }, locale);
  const text = short || today ? formatKarachi(at, { hour: 'numeric', minute: '2-digit' }, locale) : formatKarachi(at, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }, locale);
  return <time className="mtime" dateTime={new Date(at).toISOString()} title={full}>{text}</time>;
}

function VoiceNote({ seconds }: { seconds: number }) {
  const t = useT();
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setPos(p => { if (p + 1 >= seconds) { setPlaying(false); return 0; } return p + 1; }), 1000);
    return () => clearInterval(id);
  }, [playing, seconds]);
  const bars = useMemo(() => Array.from({ length: 28 }, (_, i) => 6 + ((i * 37) % 17)), []);
  return (
    <div className="vnote">
      <IconButton icon={playing ? Pause : Play} label={playing ? t('Pause voice note') : t('Play voice note')} onClick={() => setPlaying(p => !p)} size="sm" />
      <span className="vnote-bars" aria-hidden="true">{bars.map((h, i) => <i key={i} style={{ height: h, opacity: i / bars.length < pos / seconds ? 1 : 0.4 }} />)}</span>
      <span className="tnum meta">{clock(playing ? pos : seconds)}</span>
      <span className="sr">{t('Demo playback, no audio')}</span>
    </div>
  );
}

function Attachments({ m, serverId }: { m: Message; serverId?: string }) {
  const t = useT();
  const stickers = useApp(s => (serverId ? s.servers[serverId]?.stickers : undefined));
  return (
    <div className="atts">
      {m.attachments.map((a, i) => {
        if (a.kind === 'image') return (
          <figure key={i} className="att-img">
            {a.url ? <img src={a.url} alt={a.name} /> : <Art seed={a.seed} color="#5AA9F5" style="fun" w={360} h={200} />}
            <figcaption className="meta">{a.name}</figcaption>
          </figure>
        );
        if (a.kind === 'file') return (
          <div key={i} className="att-file">
            <FileText size={22} aria-hidden="true" />
            <span className="grow"><b className="ellip block">{a.name}</b><span className="meta">{a.size}</span></span>
            <IconButton icon={Download} label={t('Download {name}', { name: a.name })} onClick={() => { download(a.name + '.demo.txt', `Ghar demo placeholder for ${a.name}. No real file exists in this prototype.`); toast('Demo placeholder downloaded'); }} />
          </div>
        );
        if (a.kind === 'voice') return <VoiceNote key={i} seconds={a.seconds} />;
        const st = stickers?.find(x => x.id === a.id);
        return <span key={i} className="att-sticker" role="img" aria-label={t('Sticker: {name}', { name: st?.name ?? a.id })}>{st?.art.kind === 'glyph' ? st.art.glyph : '🙂'}</span>;
      })}
    </div>
  );
}

interface RowProps { k: MsgKey; m: Message; grouped: boolean; serverId?: string; canModerate: boolean; inThread?: boolean; readOnly?: boolean }

const MessageRow = memo(function MessageRow({ k, m, grouped, serverId, canModerate, inThread, readOnly }: RowProps) {
  const t = useT();
  const menu = useMenu();
  const reactMenu = useMenu();
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const replyTarget = useApp(s => {
    if (!m.replyTo) return undefined;
    const list = k.scope === 'channel' ? s.messages[k.id] : k.scope === 'dm' ? s.conversations[k.id]?.messages : s.threads[k.id]?.messages;
    return list?.find(x => x.id === m.replyTo);
  });
  const replyAuthor = useApp(s => (replyTarget ? s.users[replyTarget.author]?.name : undefined));
  const thread = useApp(s => (m.threadId ? s.threads[m.threadId] : undefined));
  const title = useApp(s => { const u = s.users[m.author]; return u?.titleId ? u.titleId : undefined; });
  const isBot = useApp(s => !!s.users[m.author]?.bot);
  const authorName = useApp(s => s.users[m.author]?.name ?? '');
  const meName = useApp(s => s.users[ME]!.handle);
  const mine = m.author === ME;
  const mentionsMe = !mine && (m.text.includes('@' + meName) || m.text.includes('@everyone'));
  if (m.system) return <li className="msys"><span className="meta">{m.text}</span> <TimeStamp at={m.at} short /></li>;

  const items: (MenuItem | 'sep')[] = [
    { id: 'reply', label: t('Reply'), icon: <Reply size={16} />, onSelect: () => setReply(k, m.id) },
    ...(k.scope === 'channel' && !inThread ? [{ id: 'thread', label: thread ? t('Open thread') : t('Start a thread'), icon: <MessagesSquare size={16} />, onSelect: () => openThread(k.id, m.id) }] : []),
    { id: 'copy', label: t('Copy text'), icon: <Copy size={16} />, onSelect: () => { navigator.clipboard?.writeText(m.text).then(() => toast('Copied'), () => toast('Couldn’t copy. Select the text instead.', { tone: 'warn' })); } },
    ...(mine && m.delivery === 'sent' ? [{ id: 'edit', label: t('Edit'), icon: <Pencil size={16} />, onSelect: () => openModal({ kind: 'editMessage', scope: k.scope, key: k.id, messageId: m.id }) }] : []),
    ...(canModerate && k.scope === 'channel' ? [{ id: 'pin', label: m.pinned ? t('Unpin') : t('Pin'), icon: <Pin size={16} />, onSelect: () => togglePin(k, m.id) }] : []),
    'sep',
    { id: 'author', label: t('View profile'), icon: <User size={16} />, onSelect: () => go({ name: 'profile', userId: m.author }) },
    ...(!mine && !isBot && k.scope !== 'dm' ? [{ id: 'dm', label: t('Message {name}', { name: authorName }), icon: <MessageSquare size={16} />, onSelect: () => go({ name: 'dm', convId: dmWith(m.author) }) }] : []),
    ...(!mine && !isBot ? [{ id: 'call', label: t('Voice call'), icon: <Phone size={16} />, onSelect: () => { const c = k.scope === 'dm' ? k.id : dmWith(m.author); go({ name: 'dm', convId: c }); startCall(c); } }] : []),
    'sep',
    ...(!mine ? [{ id: 'report', label: t('Report message'), icon: <Flag size={16} />, onSelect: () => openModal({ kind: 'report', target: { kind: 'message', scope: k.scope === 'dm' ? 'dm' : 'channel', key: k.id, messageId: m.id } }) }] : []),
    ...(mine ? [{ id: 'del', label: k.scope === 'dm' ? t('Delete for me') : t('Delete'), icon: <Trash2 size={16} />, danger: true, onSelect: () => remove(k, m.id) }] : []),
    ...(!mine && canModerate && k.scope === 'channel' && serverId ? [{ id: 'mod', label: t('Remove (moderator)'), icon: <ShieldAlert size={16} />, danger: true, onSelect: () => removeMessageAsModerator(serverId, k.id, m.id) }] : []),
  ];

  return (
    <li className={`msg ${grouped ? 'is-grouped' : ''} ${mentionsMe ? 'is-mention' : ''} ${m.delivery !== 'sent' ? 'is-' + m.delivery : ''}`} data-ctx="message" data-key={keyStr(k)} data-id={m.id} id={`msg-${m.id}`}
      onContextMenu={e => {
        const el = e.target as HTMLElement;
        if (el.closest('input, textarea, a, [data-ctx="user"]') || (getSelection()?.toString().trim() ?? '')) return;
        e.preventDefault(); setPoint({ x: e.clientX, y: e.clientY }); menu.open(e.currentTarget.querySelector<HTMLElement>('.mtools button:last-child') ?? e.currentTarget);
      }}>
      {replyTarget && (
        <div className="mreply"><CornerUpLeft size={14} aria-hidden="true" className="flip" /><b>{replyAuthor}</b><span className="ellip">{replyTarget.text}</span></div>
      )}
      <div className="mrow">
        <div className="mgutter">{grouped ? <span className="mtime-hover"><TimeStamp at={m.at} short /></span> : <button type="button" className="mav" onClick={() => go({ name: 'profile', userId: m.author })} aria-label={t('View profile')}><Avatar userId={m.author} size={40} /></button>}</div>
        <div className="mbody">
          {!grouped && (
            <div className="mhead">
              <button type="button" className="mname-btn" data-ctx="user" data-id={m.author} onClick={() => go({ name: 'profile', userId: m.author })}><RoleName userId={m.author} serverId={serverId} /></button>
              {isBot && <Tag tone="outline">{t('Bot')}</Tag>}
              {title && !isBot && <span className="mtitle">{TITLES.find(x => x.id === title)?.name}</span>}
              {m.origin && <Tag tone="outline" icon={Link2}>{t('from {name}', { name: m.origin })}</Tag>}
              <TimeStamp at={m.at} />
            </div>
          )}
          {m.text && <div className="mtext"><Markdown text={m.text} serverId={serverId} />{m.editedAt && <span className="medited">{t('(edited)')}</span>}</div>}
          {m.attachments.length > 0 && <Attachments m={m} serverId={serverId} />}
          {m.link && <a className="linkcard" href={`https://${m.link.host}`} onClick={e => { e.preventDefault(); openModal({ kind: 'externalLink', href: `https://${m.link!.host}` }); }}><span className="meta">{m.link.host}</span><b>{m.link.title}</b><span className="muted small">{m.link.description}</span></a>}
          {m.delivery === 'sending' && <p className="mstate"><span className="spinner" aria-hidden="true" />{t('Sending…')}</p>}
          {m.delivery === 'queued' && <p className="mstate"><Clock size={14} aria-hidden="true" />{t('Waiting for connection. It will send automatically.')}</p>}
          {m.delivery === 'failed' && (
            <p className="mstate is-failed" role="alert"><AlertCircle size={14} aria-hidden="true" />{t('Couldn’t send.')}
              <Button size="sm" variant="ghost" icon={RotateCw} onClick={() => retry(k, m.id)}>{t('Retry')}</Button>
              <Button size="sm" variant="ghost" icon={X} onClick={() => discardFailed(k, m.id)}>{t('Discard')}</Button>
            </p>
          )}
          {Object.keys(m.reactions).length > 0 && (
            <div className="reacts">
              {Object.entries(m.reactions).map(([e, users]) => (
                <button key={e} type="button" className={`react ${users.includes(ME) ? 'is-mine' : ''}`} aria-pressed={users.includes(ME)} aria-label={t('{emoji} reaction, {n}', { emoji: e, n: users.length })} onClick={() => react(k, m.id, e)}>
                  <span aria-hidden="true">{e}</span><span className="tnum">{users.length}</span>
                </button>
              ))}
            </div>
          )}
          {thread && !inThread && (
            <button type="button" className="mthread" onClick={() => openThread(k.id, m.id)}>
              <MessagesSquare size={14} aria-hidden="true" />{plural(t, thread.messages.length, '{n} reply', '{n} replies')}
              {thread.messages.some(x => x.at > thread.lastReadAt) && <span className="tag tag-green">{t('New')}</span>}
            </button>
          )}
        </div>
        {!readOnly && m.delivery === 'sent' && (
          <div className="mtools" role="toolbar" aria-label={t('Message actions')}>
            <IconButton icon={SmilePlus} size="sm" label={t('Add reaction')} aria-haspopup="menu" onClick={e => reactMenu.open(e.currentTarget)} />
            <IconButton icon={Reply} size="sm" label={t('Reply')} onClick={() => setReply(k, m.id)} />
            {k.scope === 'channel' && !inThread && <IconButton icon={MessagesSquare} size="sm" label={thread ? t('Open thread') : t('Start a thread')} onClick={() => openThread(k.id, m.id)} />}
            <IconButton icon={MoreHorizontal} size="sm" label={t('More actions')} aria-haspopup="menu" onClick={e => menu.open(e.currentTarget)} />
          </div>
        )}
      </div>
      {menu.isOpen && <Menu label={t('Message actions')} anchor={menu.anchor} point={point} onClose={() => { menu.close(); setPoint(null); }} items={items} />}
      {reactMenu.isOpen && <Menu label={t('Add reaction')} anchor={reactMenu.anchor} onClose={reactMenu.close} items={QUICK_REACTIONS.map(e => ({ id: e, label: e, onSelect: () => react(k, m.id, e) }))} />}
    </li>
  );
});

/** Message list: groups by author/time, adds day dividers, keeps per-conversation scroll, pages older history. */
export function MessageList({ k, messages, serverId, empty, readOnly, inThread }: { k: MsgKey; messages: Message[]; serverId?: string; empty?: ReactNode; readOnly?: boolean; inThread?: boolean }) {
  const t = useT();
  const locale = useLocale();
  const ref = useRef<HTMLDivElement>(null);
  const [limit, setLimit] = useState(PAGE);
  const canModerate = useApp(s => (serverId ? canManage(s, serverId, 'manageMessages') : false));
  const hidden = useApp(useShallow(s => (k.scope === 'dm' ? s.conversations[k.id]?.hiddenForMe ?? [] : [])));
  const visible = useMemo(() => messages.filter(m => !hidden.includes(m.id)), [messages, hidden]);
  const shown = visible.slice(-limit);
  const id = keyStr(k);
  const stick = useRef(true);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const saved = SCROLL.get(id);
    el.scrollTop = saved ?? el.scrollHeight;
    stick.current = saved === undefined || el.scrollHeight - saved - el.clientHeight < 80;
    setLimit(PAGE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [visible.length]);
  const jump = useApp(s => s.jump);
  useLayoutEffect(() => {
    if (!jump || jump.key !== id) return;
    const idx = visible.findIndex(m => m.id === jump.id);
    if (idx < 0) { update(s => { s.jump = null; }); return; }
    const need = visible.length - idx;
    if (need > limit) { setLimit(Math.ceil(need / PAGE) * PAGE); return; }
    const el = ref.current?.querySelector<HTMLElement>(`#msg-${CSS.escape(jump.id)}`);
    if (!el) return;
    stick.current = false;
    el.scrollIntoView({ block: 'center' });
    el.classList.add('is-jump');
    setTimeout(() => el.classList.remove('is-jump'), 2400);
    update(s => { s.jump = null; });
  }, [jump, id, limit, visible]);
  const onScroll = () => { const el = ref.current!; SCROLL.set(id, el.scrollTop); stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; };

  let lastDay = '';
  return (
    <div ref={ref} className="msgs scroll" onScroll={onScroll} role="log" aria-label={t('Messages')} aria-live="polite" aria-relevant="additions" tabIndex={0}>
      {visible.length > limit && <div className="msgs-more"><Button size="sm" variant="ghost" onClick={() => setLimit(l => l + PAGE)}>{t('Load earlier messages')}</Button></div>}
      {!visible.length && empty}
      <ol className="msg-list">
        {shown.map((m, i) => {
          const prev = shown[i - 1];
          const day = karachiDay(m.at);
          const divider = day !== lastDay;
          lastDay = day;
          const grouped = !divider && !!prev && !prev.system && !m.system && prev.author === m.author && m.at - prev.at < 5 * MIN && !m.replyTo;
          return (
            <MsgFragment key={m.id} divider={divider ? formatKarachi(m.at, { weekday: 'long', day: 'numeric', month: 'long' }, locale) : null}>
              <MessageRow k={k} m={m} grouped={grouped} serverId={serverId} canModerate={canModerate} readOnly={readOnly} inThread={inThread} />
            </MsgFragment>
          );
        })}
      </ol>
    </div>
  );
}
function MsgFragment({ divider, children }: { divider: string | null; children: ReactNode }) {
  return <>{divider && <li className="daydiv" role="separator"><span>{divider}</span></li>}{children}</>;
}
const SCROLL = new Map<string, number>();
