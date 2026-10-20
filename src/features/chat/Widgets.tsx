import { Laugh, Smile, Meh, Annoyed, Frown } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { Play, Pause, SkipForward, Eraser, Undo2, Trash2, Download, PenLine, Lock, HeartHandshake, CalendarDays } from 'lucide-react';
import type { Channel } from '@/types/models';
import { useApp, update } from '@/state/store';
import { go, toast, ask } from '@/state/actions/ui';
import { useT, useLocale, msg } from '@/i18n';
import { formatKarachi } from '@/domain/time';
import { Button, IconButton } from '@/ui/Button';
import { DemoTag, Note, Tag } from '@/ui/Misc';
import { Toggle } from '@/ui/Form';
import { ME } from '@/fixtures/users';

export function ChannelWidget({ channel }: { channel: Channel }) {
  switch (channel.widget) {
    case 'cricket': return <Cricket />;
    case 'mood': return <Mood />;
    case 'helplines': return <Helplines />;
    case 'events': return <EventsStrip serverId={channel.serverId} />;
    default: return null;
  }
}

/* ---------------- Pomodoro (LOC-04) ---------------- */
export function Pomodoro() {
  const t = useT();
  const [left, setLeft] = useState(1122);
  const [run, setRun] = useState(true);
  const [round, setRound] = useState(3);
  useEffect(() => { if (!run) return; const id = setInterval(() => setLeft(l => { if (l <= 1) { setRun(false); toast('Focus round finished. Take a 5-minute break.'); return 0; } return l - 1; }), 1000); return () => clearInterval(id); }, [run]);
  const mm = String(Math.floor(left / 60)).padStart(2, '0'), ss = String(left % 60).padStart(2, '0');
  const pct = 1 - left / 1500;
  return (
    <section className="panel pomo" aria-label={t('Focus timer')}>
      <div className="pomo-ring" role="timer" aria-label={t('{m} minutes {s} seconds left in round {r}', { m: mm, s: ss, r: round })}>
        <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="54" className="trk" /><circle cx="60" cy="60" r="54" className="prog" style={{ strokeDasharray: 339.3, strokeDashoffset: 339.3 * (1 - pct) }} /></svg>
        <b className="tnum ltr">{mm}:{ss}</b>
      </div>
      <div className="col g8 grow">
        <h3>{t('Focus round {n} of 4', { n: round })}</h3>
        <p className="muted small">{t('Everyone in the room shares this timer. A 5-minute break comes next.')}</p>
        <p className="meta">{t('Your study time today: {time} (sample)', { time: '1 h 20 min' })}</p>
        <div className="row g8 wrap">
          <Button size="sm" icon={run ? Pause : Play} onClick={() => setRun(r => !r)}>{run ? t('Pause') : t('Resume')}</Button>
          <Button size="sm" variant="ghost" icon={SkipForward} onClick={() => { setRound(r => (r >= 4 ? 1 : r + 1)); setLeft(1500); setRun(true); }}>{t('Skip to next round')}</Button>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Whiteboard (EVT-03): host controls who can draw ---------------- */
type Stroke = { pts: [number, number][]; color: string; w: number };
export function Whiteboard({ hostId }: { hostId: string }) {
  const t = useT();
  const drawers = useApp(s => s.stage.drawers);
  const users = useApp(s => s.users);
  const isHost = hostId === ME;
  const canDraw = isHost || drawers.includes(ME);
  const cv = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [color, setColor] = useState('#F2F3F5');
  const cur = useRef<Stroke | null>(null);
  useEffect(() => {
    const c = cv.current; if (!c) return;
    const r = c.getBoundingClientRect(); c.width = r.width * devicePixelRatio; c.height = r.height * devicePixelRatio;
    const g = c.getContext('2d')!; g.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0); g.clearRect(0, 0, r.width, r.height); g.lineCap = 'round'; g.lineJoin = 'round';
    for (const s of strokes) { g.strokeStyle = s.color; g.lineWidth = s.w; g.beginPath(); s.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); }
  }, [strokes]);
  const pos = (e: RPointerEvent<HTMLCanvasElement>): [number, number] => { const r = e.currentTarget.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const down = (e: RPointerEvent<HTMLCanvasElement>) => { if (!canDraw) return; e.currentTarget.setPointerCapture(e.pointerId); cur.current = { pts: [pos(e)], color: tool === 'eraser' ? getComputedStyle(document.documentElement).getPropertyValue('--well') : color, w: tool === 'eraser' ? 18 : 3 }; };
  const move = (e: RPointerEvent<HTMLCanvasElement>) => { if (!cur.current) return; cur.current.pts.push(pos(e)); setStrokes(s => [...s.filter(x => x !== cur.current), { ...cur.current! }]); };
  const up = () => { if (cur.current) { const st = cur.current; setStrokes(s => [...s.filter(x => x.pts !== st.pts), st]); } cur.current = null; };
  return (
    <section className="panel wb" aria-label={t('Whiteboard')}>
      <div className="row g8 wrap wb-tools">
        <b className="grow">{t('Whiteboard')}</b>
        {canDraw ? (
          <>
            <IconButton icon={PenLine} label={t('Pen')} pressed={tool === 'pen'} size="sm" onClick={() => setTool('pen')} />
            <IconButton icon={Eraser} label={t('Eraser')} pressed={tool === 'eraser'} size="sm" onClick={() => setTool('eraser')} />
            {['#F2F3F5', '#3CCB91', '#E5B454', '#F07878', '#9CC3F5'].map(c => <button key={c} type="button" className={`swatch ${color === c ? 'is-on' : ''}`} style={{ background: c }} aria-label={t('Colour {c}', { c })} aria-pressed={color === c} onClick={() => { setColor(c); setTool('pen'); }} />)}
            <IconButton icon={Undo2} label={t('Undo stroke')} size="sm" disabled={!strokes.length} onClick={() => setStrokes(s => s.slice(0, -1))} />
            <IconButton icon={Trash2} label={t('Clear board')} size="sm" disabled={!strokes.length} onClick={() => ask({ title: msg('Clear the whiteboard?'), body: msg('Everyone loses the current drawing.'), confirmLabel: msg('Clear'), tone: 'danger', onConfirm: () => setStrokes([]) })} />
            <IconButton icon={Download} label={t('Save as image')} size="sm" onClick={() => { const a = document.createElement('a'); a.href = cv.current!.toDataURL('image/png'); a.download = 'whiteboard.png'; a.click(); }} />
          </>
        ) : <Tag icon={Lock}>{t('Only people the host allows can draw')}</Tag>}
      </div>
      <canvas ref={cv} className={`wb-canvas ${canDraw ? '' : 'is-readonly'}`} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} role="img" aria-label={t('Shared whiteboard with {n} strokes. Drawing needs a pointer.', { n: strokes.length })} />
      {isHost ? (
        <div className="wb-perm">
          <h4 className="label">{t('Who can draw')}</h4>
          {['ayesha', 'hamza', 'zainab'].map(u => <Toggle key={u} label={users[u]?.name ?? u} checked={drawers.includes(u)} onChange={v => update(s => { s.stage.drawers = v ? [...s.stage.drawers, u] : s.stage.drawers.filter(x => x !== u); })} />)}
        </div>
      ) : <p className="meta">{t('Host: {name}. Drawing is shared live in a real session; here it stays in your browser.', { name: users[hostId]?.name ?? '' })}</p>}
    </section>
  );
}

/* ---------------- Cricket (LOC-01): sample data, no licensed feed ---------------- */
export function Cricket() {
  const t = useT();
  const [k, setK] = useState({ runs: 241, wk: 4, balls: 230, over: ['1', '4', '0', 'W', '6', '1'] });
  useEffect(() => {
    const id = setInterval(() => setK(s => {
      if (s.balls >= 300 || document.hidden) return s;
      const r = ['0', '1', '1', '2', '4', '6', 'W', '1', '0'][Math.floor(Math.random() * 9)]!;
      return { runs: s.runs + (r === 'W' ? 0 : Number(r)), wk: Math.min(10, s.wk + (r === 'W' ? 1 : 0)), balls: s.balls + 1, over: [...s.over, r].slice(-6) };
    }), 7000);
    return () => clearInterval(id);
  }, []);
  const ov = `${Math.floor(k.balls / 6)}.${k.balls % 6}`;
  return (
    <section className="widget cricket" aria-label={t('Match score')}>
      <div className="row g8 wrap"><b>PAK vs AUS · {t('2nd ODI')}</b><Tag tone="red">{t('LIVE')}</Tag><span className="grow" /><DemoTag>{t('Sample data · no licensed feed connected')}</DemoTag></div>
      <div className="row g16 wrap mt8">
        <span className="score tnum ltr">{k.runs}/{k.wk}</span>
        <span className="muted small tnum">{t('{ov} overs · need {n} from {b} balls', { ov, n: Math.max(0, 288 - k.runs), b: Math.max(0, 300 - k.balls) })}</span>
        <span className="balls" aria-label={t('This over')}>{k.over.map((b, i) => <i key={i} className={b === 'W' ? 'is-w' : b === '4' || b === '6' ? 'is-b' : ''}>{b}</i>)}</span>
      </div>
    </section>
  );
}

/* ---------------- Mood check-in (LOC-03): fictional session data, never persisted ---------------- */
const MOODS = [['great', Laugh], ['good', Smile], ['okay', Meh], ['meh', Annoyed], ['low', Frown]] as const;
export function Mood() {
  const t = useT();
  const mood = useApp(s => s.mood);
  const label = { great: msg('Great'), good: msg('Good'), okay: msg('Okay'), meh: msg('Meh'), low: msg('Low') } as const;
  return (
    <section className="widget mood" aria-label={t('Mood check-in')}>
      <div className="row g8 wrap"><b>{t('How are you today?')}</b><span className="meta">{t('Private to you. Not saved after you leave this demo.')}</span></div>
      <div className="moods" role="group" aria-label={t('Pick a mood')}>
        {MOODS.map(([k, MoodIcon]) => <button key={k} type="button" aria-pressed={mood.today === k} className={mood.today === k ? 'is-on' : ''} onClick={() => update(s => { s.mood.today = k; s.mood.history = [...s.mood.history.slice(-6), k]; })}><MoodIcon size={22} aria-hidden="true" />{t(label[k])}</button>)}
      </div>
      <p className="meta">{t('Last 7 check-ins:')} <span aria-label={mood.history.map(h => t(label[h as keyof typeof label] ?? msg('Okay'))).join(', ')}>{mood.history.slice(-7).map((h, i) => { const M = MOODS.find(m => m[0] === h)?.[1] ?? Meh; return <M key={i} size={16} aria-hidden="true" className="mood-hist" />; })}</span></p>
    </section>
  );
}
export function SupportCard() {
  const t = useT();
  return (
    <Note tone="warn" title={t('You don’t have to go through this alone')}>
      {t('If you might act on thoughts of harming yourself, contact your local emergency number now or someone you trust. Trained moderators in this community can also talk with you.')}
      <span className="block mt8">{t('Verified helpline details would appear here once the safety team adds them. This demo doesn’t list numbers.')}</span>
    </Note>
  );
}
export function Helplines() {
  const t = useT();
  return (
    <section className="widget" aria-label={t('Support resources')}>
      <div className="row g8"><HeartHandshake size={18} aria-hidden="true" /><b>{t('Support resources')}</b></div>
      <p className="muted small mt8">{t('This is peer support, not a crisis service. In an emergency, contact your local emergency number.')}</p>
      <p className="meta mt8">{t('The safety team publishes verified helplines here. No helpline contact details are shown in this demo.')}</p>
    </section>
  );
}

function EventsStrip({ serverId }: { serverId: string }) {
  const t = useT();
  const locale = useLocale();
  const events = useApp(useShallow(s => s.events.filter(e => e.serverId === serverId).sort((a, b) => a.startsAt - b.startsAt)));
  const rsvps = useApp(s => s.rsvps);
  if (!events.length) return null;
  return (
    <section className="widget" aria-label={t('Upcoming events')}>
      <div className="row g8"><CalendarDays size={18} aria-hidden="true" /><b className="grow">{t('Upcoming events')}</b><Button size="sm" variant="ghost" onClick={() => go({ name: 'events', serverId })}>{t('See all')}</Button></div>
      <ul className="evstrip">{events.slice(0, 3).map(e => <li key={e.id}><b className="ellip">{e.name}</b><span className="meta">{formatKarachi(e.startsAt, { weekday: 'short', hour: 'numeric', minute: '2-digit' }, locale)}{rsvps[e.id] ? ` · ${rsvps[e.id] === 'going' ? t('Going') : t('Interested')}` : ''}</span></li>)}</ul>
    </section>
  );
}
