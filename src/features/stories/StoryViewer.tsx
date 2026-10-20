import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Heart, Pause, Play, Trash2, Users, Bookmark, Eye, Flag, SendHorizontal } from 'lucide-react';
import { useApp } from '@/state/store';
import { storyList, storyStep, closeStories, likeStory, replyToStory, deleteStory } from '@/state/actions/stories';
import { openModal } from '@/state/actions/ui';
import { useT, msg, type Key } from '@/i18n';
import { relTime } from '@/domain/time';
import { Avatar } from '@/ui/Avatar';
import { Art } from '@/ui/Art';
import { IconButton, Button } from '@/ui/Button';
import { ME } from '@/fixtures/users';

const DURATION = 6000;
const AUD: Record<string, Key> = { everyone: msg('Everyone'), friends: msg('Friends'), close: msg('Close friends'), custom: msg('Custom') };

export function StoryViewer() {
  const v = useApp(s => s.storyViewer);
  if (!v) return null;
  return <Viewer owner={v.owner} index={v.index} highlightId={v.highlightId} />;
}

function Viewer({ owner, index, highlightId }: { owner: string; index: number; highlightId?: string }) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);
  const storiesState = useApp(s => s.stories);
  const hlState = useApp(s => s.highlights);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stories = useMemo(() => storyList(owner, highlightId), [owner, highlightId, storiesState, hlState]);
  const st = stories[index];
  const user = useApp(s => s.users[owner]);
  const now = useApp(s => s.now);
  const reduce = useApp(s => s.prefs.reduceMotion) ?? matchMedia('(prefers-reduced-motion: reduce)').matches;
  const users = useApp(s => s.users);
  const hl = useApp(s => (highlightId ? s.highlights.find(h => h.id === highlightId) : undefined));
  const [paused, setPaused] = useState(reduce);
  const [elapsed, setElapsed] = useState(0);
  const [reply, setReply] = useState('');
  const [showViewers, setShowViewers] = useState(false);
  const mine = owner === ME;

  useLayoutEffect(() => {
    const d = ref.current!;
    if (!d.open) d.showModal();
    const cancel = (e: Event) => { e.preventDefault(); closeStories(); };
    d.addEventListener('cancel', cancel);
    const opener = document.activeElement as HTMLElement | null;
    return () => { d.removeEventListener('cancel', cancel); if (d.open) d.close(); requestAnimationFrame(() => opener?.focus?.()); };
  }, []);
  useEffect(() => { setElapsed(0); setShowViewers(false); }, [index]);
  useEffect(() => {
    if (paused || reply || showViewers) return;
    const id = setInterval(() => setElapsed(e => { if (e + 100 >= DURATION) { storyStep(1); return 0; } return e + 100; }), 100);
    return () => clearInterval(id);
  }, [paused, reply, showViewers, index]);

  if (!st || !user) return null;
  const onKey = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    const rtl = document.documentElement.dir === 'rtl';
    if (e.key === 'ArrowRight') storyStep(rtl ? -1 : 1);
    if (e.key === 'ArrowLeft') storyStep(rtl ? 1 : -1);
    if (e.key === ' ') { e.preventDefault(); setPaused(p => !p); }
  };
  return (
    <dialog ref={ref} className="story-dlg" aria-label={t('{name}’s story, {i} of {n}', { name: user.name, i: index + 1, n: stories.length })} onKeyDown={onKey}>
      <div className="story-stage">
        <div className="story-bars" aria-hidden="true">{stories.map((s, i) => <span key={s.id}><i style={{ width: i < index ? '100%' : i === index ? `${(elapsed / DURATION) * 100}%` : '0%' }} /></span>)}</div>
        <header className="story-top">
          <Avatar userId={owner} size={36} />
          <span className="grow"><b>{user.name}</b><span className="meta block">{hl ? t('Highlight: {name}', { name: hl.name }) : relTime(st.createdAt, now)}{mine && !hl ? ` · ${t(AUD[st.audience]!)}` : ''}</span></span>
          <IconButton icon={paused ? Play : Pause} label={paused ? t('Play') : t('Pause')} onClick={() => setPaused(p => !p)} className="on-dark" />
          <IconButton icon={X} label={t('Close')} onClick={closeStories} className="on-dark" />
        </header>
        <figure className="story-img">
          {st.image.kind === 'local' ? <img src={st.image.url} alt={st.image.caption || t('Story photo')} /> : <Art seed={st.image.seed} color={st.image.color} style="fun" w={540} h={960} />}
          {st.image.caption && <figcaption className="story-cap">{st.image.caption}</figcaption>}
        </figure>
        <button type="button" className="story-nav prev" aria-label={t('Previous story')} onClick={() => storyStep(-1)} disabled={index === 0}><ChevronLeft size={28} aria-hidden="true" className="flip" /></button>
        <button type="button" className="story-nav next" aria-label={t('Next story')} onClick={() => storyStep(1)}><ChevronRight size={28} aria-hidden="true" className="flip" /></button>
        <footer className="story-foot">
          {mine ? (
            <>
              <Button size="sm" variant="ghost" icon={Eye} className="on-dark" aria-expanded={showViewers} onClick={() => setShowViewers(x => !x)}>{t('{n} viewers', { n: st.viewers.length })}</Button>
              {!hl && <IconButton icon={Users} label={t('Change audience')} className="on-dark" onClick={() => openModal({ kind: 'storyAudience', storyId: st.id })} />}
              <IconButton icon={Bookmark} label={t('Add to highlight')} className="on-dark" onClick={() => openModal({ kind: 'highlight', storyId: st.id })} />
              <IconButton icon={Trash2} label={t('Delete story')} className="on-dark" onClick={() => deleteStory(st.id)} />
            </>
          ) : (
            <form className="story-reply" onSubmit={e => { e.preventDefault(); replyToStory(st.id, reply); setReply(''); }}>
              <label className="sr" htmlFor="story-reply">{t('Reply to {name}', { name: user.name })}</label>
              <input id="story-reply" value={reply} onChange={e => setReply(e.target.value)} placeholder={t('Reply to {name}', { name: user.name.split(' ')[0] ?? '' })} />
              <IconButton type="submit" icon={SendHorizontal} label={t('Send reply')} disabled={!reply.trim()} className="on-dark flip" />
              <IconButton icon={Heart} label={t('Like')} pressed={st.likedBy.includes(ME)} onClick={() => likeStory(st.id)} className="on-dark" />
              <IconButton icon={Flag} label={t('Report')} className="on-dark" onClick={() => { closeStories(); openModal({ kind: 'report', target: { kind: 'user', userId: owner } }); }} />
            </form>
          )}
        </footer>
        {showViewers && (
          <div className="story-viewers" role="region" aria-label={t('Viewers')}>
            {st.viewers.length ? <ul>{st.viewers.map(v => <li key={v.userId} className="row g8"><Avatar userId={v.userId} size={28} /><span className="grow">{users[v.userId]?.name}</span>{st.likedBy.includes(v.userId) && <Heart size={14} aria-label={t('Liked')} className="bad" />}<span className="meta">{relTime(v.at, now)}</span></li>)}</ul> : <p className="meta">{t('No views yet.')}</p>}
          </div>
        )}
        {reduce && <p className="sr">{t('Auto-advance is off because reduced motion is on. Use the arrows.')}</p>}
      </div>
    </dialog>
  );
}
