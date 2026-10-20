import { useMemo, useState } from 'react';
import { Flame, Gift, MessageSquare, Headphones, Heart, CalendarDays, ShoppingBag, Zap, Trophy, Info, Search } from 'lucide-react';
import { useApp } from '@/state/store';
import { go, openModal } from '@/state/actions/ui';
import { useT, useLocale, msg, type Key } from '@/i18n';
import type { BoardPeriod, PopularitySource } from '@/types/models';
import { breakdown, supporters, history, activityToday, DEFAULT_POLICY } from '@/domain/popularity';
import { buildBoard, periodBounds } from '@/domain/leaderboard';
import { fmt } from '@/domain/format';
import { formatKarachi, relTime } from '@/domain/time';
import { matchScore } from '@/domain/search';
import { ScreenHeader } from '@/shell/Shell';
import { Avatar } from '@/ui/Avatar';
import { Button } from '@/ui/Button';
import { Medal } from '@/ui/Glyphs';
import { Empty, Section, Stat, Tag } from '@/ui/Misc';
import { RadioList, TextField } from '@/ui/Form';
import { ME } from '@/fixtures/users';
import { GIFTS } from '@/fixtures/popularity';

export const SOURCE_LABEL: Record<PopularitySource, Key> = { message: msg('Messages'), voice: msg('Voice time'), reaction: msg('Reactions received'), event: msg('Events'), gift: msg('Gift'), purchase: msg('Purchased points'), legacy: msg('Earlier activity') };
const SOURCE_ICON = { message: MessageSquare, voice: Headphones, reaction: Heart, event: CalendarDays, gift: Gift, purchase: ShoppingBag, legacy: Flame } as const;
export const PERIOD_LABEL: Record<BoardPeriod, Key> = { daily: msg('Today'), weekly: msg('This week'), all: msg('All time') };

export function BoostedTag({ points }: { points: number }) {
  const t = useT();
  if (!points) return null;
  return <Tag tone="outline" icon={Zap}>{t('{n} Boosted', { n: fmt(points) })}</Tag>;
}

export function PopularityPage() {
  const t = useT();
  const locale = useLocale();
  const events = useApp(s => s.popularity);
  const users = useApp(s => s.users);
  const activity = useApp(s => s.activity);
  const friends = useApp(s => s.friends);
  const now = useApp(s => s.now);
  const [period, setPeriod] = useState<BoardPeriod>('weekly');
  const [q, setQ] = useState('');
  const total = useMemo(() => breakdown(events, ME), [events]);
  const { since } = periodBounds(period, now);
  const inPeriod = useMemo(() => breakdown(events, ME, since), [events, since]);
  const board = useMemo(() => buildBoard(Object.values(users), events, activity, { metric: 'popularity', scope: 'global', period, me: ME, now }), [users, events, activity, period, now]);
  const today = activityToday(events, ME, now);
  const sup = useMemo(() => supporters(events, ME), [events]);
  const hist = useMemo(() => history(events, ME, 12), [events]);
  const recipients = Object.values(users).filter(u => u.id !== ME && !u.bot && (q.trim() ? matchScore(q, [u.name, u.handle]) > 0 : friends.includes(u.id))).slice(0, 8);
  const cap = DEFAULT_POLICY.dailyActivityCap;

  return (
    <>
      <ScreenHeader icon={<Flame size={20} />} title={t('Popularity')} subtitle={t('Earned from activity and gifts. Purchased points are labelled Boosted.')} actions={<Button size="sm" icon={Trophy} onClick={() => go({ name: 'leaderboards' })}>{t('Leaderboards')}</Button>} />
      <div className="scroll"><div className="page page-wide">
        <div className="pop-summary">
          <div className="pop-total">
            <span className="label">{t('Total popularity')}</span>
            <b className="pop-big tnum"><Flame size={26} aria-hidden="true" />{fmt(total.total)}</b>
            <BoostedTag points={total.boosted} />
          </div>
          <RadioList name="pop-period" legend={t('Period')} srLegend variant="segmented" value={period} onChange={setPeriod}
            options={(['daily', 'weekly', 'all'] as BoardPeriod[]).map(p => ({ value: p, label: t(PERIOD_LABEL[p]) }))} />
          <div className="stats3">
            <Stat label={t('{period} contribution', { period: t(PERIOD_LABEL[period]) })} value={fmt(inPeriod.total)} />
            <Stat label={t('Global rank · {period}', { period: t(PERIOD_LABEL[period]) })} value={board.me ? `#${board.me.rank}` : t('Not ranked')} sub={board.me ? t('of {n} ranked', { n: board.rows.length }) : t('No qualifying activity yet')} />
            <Stat label={t('Gifts received · {period}', { period: t(PERIOD_LABEL[period]) })} value={fmt(inPeriod.gifts)} />
          </div>
        </div>

        <Section title={t('Today’s activity points')} description={t('Messages, voice time, reactions and events earn points up to a daily limit. This demo uses a sample limit of {cap}.', { cap })}>
          <div className="capbar">
            <div className="capbar-track" role="progressbar" aria-valuemin={0} aria-valuemax={cap} aria-valuenow={today} aria-label={t('Activity points today')}><span style={{ width: `${Math.min(100, (today / cap) * 100)}%` }} /></div>
            <span className="tnum small">{t('{a} of {b}', { a: fmt(today), b: fmt(cap) })}</span>
          </div>
          {today >= cap && <p className="meta">{t('You’ve reached today’s limit. Gifts still count.')}</p>}
        </Section>

        <Section title={t('Breakdown')} description={t('Lifetime totals. Boosted is the part that came from payments; it is already inside the total.')}>
          <dl className="breakdown">
            <div><dt><Flame size={16} aria-hidden="true" />{t('Activity earned')}</dt><dd className="tnum">{fmt(total.activity)}</dd></div>
            <div><dt><Gift size={16} aria-hidden="true" />{t('Gifts received')}</dt><dd className="tnum">{fmt(total.gifts)}</dd></div>
            <div><dt><ShoppingBag size={16} aria-hidden="true" />{t('Purchased points')}</dt><dd className="tnum">{fmt(total.purchased)}</dd></div>
            <div className="bd-total"><dt>{t('Total')}</dt><dd className="tnum">{fmt(total.total)}</dd></div>
            <div className="bd-sub"><dt><Zap size={16} aria-hidden="true" />{t('of which Boosted (purchased + paid gifts)')}</dt><dd className="tnum">{fmt(total.boosted)}</dd></div>
          </dl>
          <p className="meta row g8"><Info size={14} aria-hidden="true" />{t('Counting paid gifts as Boosted is how this frontend presents it; it isn’t a published formula.')}</p>
        </Section>

        <div className="two-col">
          <Section title={t('Send a gift')} description={t('Gifts add popularity to the person you choose.')}>
            <TextField label={t('Find someone')} srLabel icon={Search} placeholder={t('Search people')} value={q} onChange={e => setQ(e.target.value)} />
            <ul className="giftees">{recipients.map(u => <li key={u.id}><button type="button" className="person" onClick={() => openModal({ kind: 'gift', to: u.id })}><Avatar userId={u.id} size={32} /><span className="person-text"><b>{u.name}</b><em>@{u.handle}</em></span><Gift size={16} aria-hidden="true" className="mut" /></button></li>)}</ul>
            <Button icon={ShoppingBag} onClick={() => openModal({ kind: 'buyPoints' })}>{t('Buy points for yourself')}</Button>
          </Section>
          <Section title={t('Top supporters')} description={t('People whose gifts added the most to your popularity.')}>
            {sup.length ? <ol className="supporters">{sup.slice(0, 5).map((s, i) => (
              <li key={s.userId}>
                {i < 3 ? <Medal rank={(i + 1) as 1 | 2 | 3} /> : <span className="rank tnum">{i + 1}</span>}
                <Avatar userId={s.userId} size={32} />
                <span className="grow"><b>{users[s.userId]?.name}</b><span className="meta block">{t('{n} gifts', { n: s.gifts })} · {relTime(s.lastAt, now)}</span></span>
                <b className="tnum">{fmt(s.points)}</b>
              </li>
            ))}</ol> : <Empty icon={Gift} title={t('No gifts yet')} />}
          </Section>
        </div>

        <Section title={t('Recent contributions')}>
          {hist.length ? <ul className="history">{hist.map(e => {
            const I = SOURCE_ICON[e.source];
            return (
              <li key={e.id}>
                <span className="hist-ic"><I size={16} aria-hidden="true" /></span>
                <span className="grow">
                  <b>{e.source === 'gift' ? t('{name} sent {qty} × {gift}', { name: users[e.sender ?? '']?.name ?? '', qty: e.quantity ?? 1, gift: GIFTS.find(g => g.id === e.giftId)?.name ?? '' }) : t(SOURCE_LABEL[e.source])}</b>
                  {e.note && <span className="muted small block">“{e.note}”</span>}
                  <span className="meta block">{formatKarachi(e.at, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }, locale)}{e.serverId ? ` · ${useApp.getState().servers[e.serverId]?.name ?? ''}` : ''}</span>
                </span>
                {e.paid && <Tag tone="outline" icon={Zap}>{t('Boosted')}</Tag>}
                <b className="tnum ok">+{fmt(e.points)}</b>
              </li>
            );
          })}</ul> : <Empty icon={Flame} title={t('No contributions yet')} />}
        </Section>
      </div></div>
    </>
  );
}
