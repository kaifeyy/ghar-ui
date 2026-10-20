import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Plus, Smile, SendHorizontal, X, CornerUpLeft, Mic, Square, Paperclip, FileText, Sticker, Lock, Image as ImageIcon } from 'lucide-react';
import type { Attachment } from '@/types/models';
import { useApp, EMPTY } from '@/state/store';
import { send, setReply, keyStr, MAX_LEN, type MsgKey } from '@/state/actions/messages';
import { setDraft, toast } from '@/state/actions/ui';
import { useT } from '@/i18n';
import { fold } from '@/domain/search';
import { Avatar } from '@/ui/Avatar';
import { IconButton } from '@/ui/Button';
import { Menu, useMenu } from '@/ui/Overlay';
import { clock } from '@/domain/format';
import { ME } from '@/fixtures/users';

const IMG_MAX = 8 * 1024 * 1024;
const FILE_MAX = 25 * 1024 * 1024;
const EMOJI = ['😀', '😂', '🥲', '😍', '🤔', '😎', '🙏', '👍', '👏', '🔥', '💯', '🎉', '❤️', '💚', '☕', '🏏', '📚', '🌙'];

interface Pending { att: Attachment; label: string }

export interface ComposerProps { k: MsgKey; placeholder: string; serverId?: string; disabled?: { reason: string } | null; typing?: string[] }

export function Composer({ k, placeholder, serverId, disabled, typing = [] }: ComposerProps) {
  const t = useT();
  const id = keyStr(k);
  const draft = useApp(s => s.drafts[id] ?? '');
  const replyId = useApp(s => s.replyTo[id]);
  const replyMsg = useApp(s => {
    if (!replyId) return undefined;
    const list = k.scope === 'channel' ? s.messages[k.id] : k.scope === 'dm' ? s.conversations[k.id]?.messages : s.threads[k.id]?.messages;
    return list?.find(m => m.id === replyId);
  });
  const replyName = useApp(s => (replyMsg ? s.users[replyMsg.author]?.name : ''));
  const users = useApp(s => s.users);
  const emoji = useApp(s => (serverId ? s.servers[serverId]?.emoji ?? EMPTY : EMPTY));
  const stickers = useApp(s => (serverId ? s.servers[serverId]?.stickers ?? EMPTY : EMPTY));
  const net = useApp(s => s.net);
  const ta = useRef<HTMLTextAreaElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [sugIdx, setSugIdx] = useState(0);
  const [rec, setRec] = useState<number | null>(null);
  const [recNow, setRecNow] = useState(0);
  const plus = useMenu();
  const emojiMenu = useMenu();
  const listId = useId();

  useEffect(() => { const el = ta.current; if (!el) return; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 200) + 'px'; }, [draft]);
  useEffect(() => { if (replyId) ta.current?.focus(); }, [replyId]);
  useEffect(() => { if (rec === null) return; const i = setInterval(() => setRecNow(Date.now()), 500); return () => clearInterval(i); }, [rec]);

  // @mention suggestions
  const mention = useMemo(() => {
    const m = /(?:^|\s)@([\w.]*)$/.exec(draft.slice(0, ta.current?.selectionStart ?? draft.length));
    if (!m) return null;
    const q = fold(m[1]!);
    const list = Object.values(users).filter(u => u.id !== ME && !u.bot && (u.handle.startsWith(q) || fold(u.name).startsWith(q))).slice(0, 6);
    return list.length ? { q: m[1]!, list } : null;
  }, [draft, users]);
  useEffect(() => setSugIdx(0), [mention?.q]);

  const pick = (handle: string) => {
    const el = ta.current!;
    const pos = el.selectionStart;
    const before = draft.slice(0, pos).replace(/@[\w.]*$/, '@' + handle + ' ');
    setDraft(id, before + draft.slice(pos));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(before.length, before.length); });
  };

  const submit = () => {
    if (disabled) return;
    const ok = send(k, draft, pending.map(p => p.att));
    if (ok) setPending([]);
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mention) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSugIdx(i => (i + 1) % mention.list.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSugIdx(i => (i - 1 + mention.list.length) % mention.list.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(mention.list[sugIdx]!.handle); return; }
    }
    if (e.key === 'Escape' && replyId) { setReply(k, undefined); return; }
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && matchMedia('(pointer: fine)').matches) { e.preventDefault(); submit(); }
  };

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const next: Pending[] = [];
    for (const f of Array.from(files)) {
      if (f.type === 'image/svg+xml' || /\.svg$/i.test(f.name)) { toast('SVG files can’t be uploaded.', { tone: 'warn' }); continue; }
      const isImg = /^image\/(png|jpe?g|webp|gif)$/.test(f.type);
      if (isImg && f.size > IMG_MAX) { toast('Images must be 8 MB or smaller.', { tone: 'warn' }); continue; }
      if (!isImg && f.size > FILE_MAX) { toast('Files must be 25 MB or smaller.', { tone: 'warn' }); continue; }
      const size = f.size > 1e6 ? `${(f.size / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(f.size / 1e3))} KB`;
      next.push(isImg ? { att: { kind: 'image', name: f.name, seed: f.name, url: URL.createObjectURL(f) }, label: f.name } : { att: { kind: 'file', name: f.name, size }, label: `${f.name} · ${size}` });
    }
    setPending(p => [...p, ...next].slice(0, 10));
  };

  const stopRec = (keep: boolean) => {
    if (rec === null) return;
    const sec = Math.max(1, Math.round((Date.now() - rec) / 1000));
    setRec(null);
    if (keep) setPending(p => [...p, { att: { kind: 'voice', seconds: sec }, label: t('Voice note · {time}', { time: clock(sec) }) }]);
  };

  if (disabled) return (
    <div className="composer-wrap"><div className="composer is-disabled" role="note"><Lock size={16} aria-hidden="true" /><span className="muted small">{disabled.reason}</span></div></div>
  );
  const over = draft.length > MAX_LEN;
  const ready = (draft.trim().length > 0 || pending.length > 0) && !over;

  return (
    <div className="composer-wrap">
      <div className="typing" aria-live="polite">{typing.length > 0 && <><span className="dots" aria-hidden="true"><i /><i /><i /></span>{typing.length === 1 ? t('{a} is typing…', { a: users[typing[0]!]?.name ?? '' }) : t('{a} and {b} are typing…', { a: users[typing[0]!]?.name ?? '', b: users[typing[1]!]?.name ?? '' })}</>}</div>
      {mention && (
        <ul className="suggest" id={listId} role="listbox" aria-label={t('People')}>
          {mention.list.map((u, i) => (
            <li key={u.id} id={`${listId}-${i}`} role="option" aria-selected={i === sugIdx} className={i === sugIdx ? 'is-on' : ''} onMouseDown={e => { e.preventDefault(); pick(u.handle); }}>
              <Avatar userId={u.id} size={24} /><b dir="auto">{u.name}</b><span className="meta ltr">@{u.handle}</span>
            </li>
          ))}
        </ul>
      )}
      {replyMsg && (
        <div className="replybar"><CornerUpLeft size={14} aria-hidden="true" className="flip" /><span className="grow ellip">{t('Replying to {name}', { name: replyName ?? '' })}: <span className="muted">{replyMsg.text}</span></span><IconButton icon={X} size="sm" label={t('Cancel reply')} onClick={() => setReply(k, undefined)} /></div>
      )}
      {pending.length > 0 && (
        <ul className="tray" aria-label={t('Attachments to send')}>
          {pending.map((p, i) => (
            <li key={i} className="chip-file">
              {p.att.kind === 'image' && p.att.url ? <img src={p.att.url} alt="" /> : p.att.kind === 'voice' ? <Mic size={16} aria-hidden="true" /> : <FileText size={16} aria-hidden="true" />}
              <span className="ellip">{p.label}</span>
              <IconButton icon={X} size="sm" label={t('Remove {name}', { name: p.label })} onClick={() => setPending(x => x.filter((_, j) => j !== i))} />
            </li>
          ))}
        </ul>
      )}
      <div className={`composer ${over ? 'is-over' : ''}`}>
        {rec !== null ? (
          <>
            <span className="rec" role="status"><i aria-hidden="true" /><span className="tnum">{clock(Math.round((recNow - rec) / 1000))}</span><span className="muted small">{t('Recording (demo, nothing is captured)')}</span></span>
            <span className="grow" />
            <IconButton icon={X} label={t('Cancel recording')} onClick={() => stopRec(false)} />
            <IconButton icon={Square} label={t('Stop and attach')} onClick={() => stopRec(true)} />
          </>
        ) : (
          <>
            <IconButton icon={Plus} label={t('Add attachment')} aria-haspopup="menu" onClick={e => plus.open(e.currentTarget)} />
            <label className="sr" htmlFor={`ta-${listId}`}>{placeholder}</label>
            <textarea ref={ta} id={`ta-${listId}`} rows={1} dir="auto" value={draft} placeholder={placeholder} onChange={e => setDraft(id, e.target.value)} onKeyDown={onKey} enterKeyHint="send"
              role={mention ? 'combobox' : undefined} aria-expanded={mention ? true : undefined} aria-controls={mention ? listId : undefined} aria-activedescendant={mention ? `${listId}-${sugIdx}` : undefined} aria-autocomplete="list" />
            <IconButton icon={Smile} label={t('Emoji and stickers')} aria-haspopup="menu" onClick={e => emojiMenu.open(e.currentTarget)} />
            <IconButton icon={SendHorizontal} label={net === 'online' ? t('Send') : t('Send when back online')} className={`sendb flip ${ready ? 'is-ready' : ''}`} disabled={!ready} onClick={submit} />
          </>
        )}
      </div>
      {draft.length > MAX_LEN - 200 && <p className={`fcount ${over ? 'bad' : ''}`} aria-live="polite">{draft.length} / {MAX_LEN}{over ? ` · ${t('too long, shorten to send')}` : ''}</p>}
      <input ref={file} type="file" multiple hidden accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,.zip,.docx" onChange={e => { onFiles(e.target.files); e.target.value = ''; }} />
      {plus.isOpen && <Menu label={t('Add attachment')} anchor={plus.anchor} onClose={plus.close} align="start" items={[
        { id: 'file', label: t('Upload a file'), icon: <Paperclip size={16} />, hint: t('Images 8 MB · files 25 MB'), onSelect: () => file.current?.click() },
        { id: 'voice', label: t('Record a voice note'), icon: <Mic size={16} />, onSelect: () => { setRec(Date.now()); setRecNow(Date.now()); } },
      ]} />}
      {emojiMenu.isOpen && <Menu label={t('Emoji and stickers')} anchor={emojiMenu.anchor} onClose={emojiMenu.close} items={[
        ...emoji.map(e => ({ id: 'ce' + e.id, label: `:${e.name}:`, icon: <span aria-hidden="true">{e.art.kind === 'glyph' ? e.art.glyph : <ImageIcon size={16} />}</span>, onSelect: () => setDraft(id, (draft ? draft + ' ' : '') + `:${e.name}: `) })),
        ...stickers.map(st => ({ id: 'st' + st.id, label: t('Sticker: {name}', { name: st.name }), icon: <Sticker size={16} />, onSelect: () => send(k, '', [{ kind: 'sticker', id: st.id }]) })),
        ...(emoji.length || stickers.length ? ['sep' as const] : []),
        ...EMOJI.map(e => ({ id: e, label: e, onSelect: () => { setDraft(id, draft + e); ta.current?.focus(); } })),
      ]} />}
    </div>
  );
}
