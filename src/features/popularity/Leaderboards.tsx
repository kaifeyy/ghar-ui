import { useMemo, useState } from 'react';
import { Trophy, Flame, MessageSquare, Headphones, BookOpen, Zap, Clock } from 'lucide-react';
import { useApp } from '@/state/store';
import { go } from '@/state/actions/ui';
import { useT, useLocale, msg, type Key } from '@/i18n';
import type { BoardMetric, BoardPeriod, BoardScope } from '@/types/models';
import { buildBoard, asHours, type BoardRow } from '@/domain/leaderboard';
import { fmt } from '@/domain/format';
import { formatKarachi } from '@/domain/time';
import { ScreenHeader } from '@/shell/Shell';
import { Avatar } from '@/ui/Avatar';
import { Button } from '@/ui/Button';
import { Medal } from '@/ui/Glyphs';
import { Empty, Tag } from '@/ui/Misc';
import { RadioList, Select, Tabs, TabPanel } from '@/ui/Form';
import { PERIOD_LABEL } from './PopularityPage';
import { ME, TITLES } from '@/fixtures/users';

const METRIC: Record<BoardMetric, { label: Key; icon: typeof Flame; unit: Key }> = {
  popularity: { label: msg('Popularity'), icon: Flame, unit: msg('points') },
  messages: { label: msg('Most messages'), icon: MessageSquare, unit: msg('messages') },
  voice: { label: msg('Voice hours'), icon: Headphones, unit: msg('hours') },
  study: { label: msg('Study hours'), icon: BookOpen, unit: msg('hours') },
};
const SCOPE_LABEL: Record<BoardScope, Key> = { global: msg('Global'), city: msg('City'), server: msg('Community'), friends: msg('Friends') };
const PAGE = 20;

function ScoreText({ metric, value }: { metric: BoardMetric; value: number }) {
  return <span className="tnum">{metric === 'voice' || metric === 'study' ? asHours(value).toLocaleString() : fmt(value)}</span>;
}

export function Leaderboards() {
  const t = useT();
  const locale = useLocale();
  const users = useApp(s => s.users);
  const events = useApp(s => s.popularity);
  const activity = useApp(s => s.activity);
  const friends = useApp(s => s.friends);
  const servers = useApp(s => s.servers);
  const joined = useApp(s => s.joined);
  const now = useApp(s => s.now);
  const meCity = useApp(s => s.users[ME]!.city);
  const [metric, setMetric] = useState<BoardMetric>('popularity');
  const [scope, setScope] = useState<BoardScope>('global');
  const [period, setPeriod] = useState<BoardPeriod>('weekly');
  const [city, setCity] = useState(meCity);
  const [serverId, setServerId] = useState(joined[0] ?? 'tc');
  const [limit, setLimit] = useState(PAGE);
  const cities = useMemo(() => [...new Set(Object.values(users).map(u => u.city).filter(Boolean))].sort(), [users]);
  const members = useMemo(() => new Set(servers[serverId]?.memberList.map(m => m.userId) ?? []), [servers, serverId]);
  const board = useMemo(() => buildBoard(Object.values(users), events, activity, { metric, scope, period, city, serverId, friends, me: ME, now }, members),
    [users, events, activity, metric, scope, period, city, serverId, friends, now, members]);
  const top = board.rows.slice(0, 3);
  const rest = board.rows.slice(3, limit);
  const M = METRIC[metric];
  const boundary = period === 'daily' ? t('Since 00:00 today') : period === 'weekly' ? t('Since Monday 00:00') : t('Since each account joined');
  const scopeLabel = scope === 'city' ? city : scope === 'server' ? servers[serverId]?.name ?? '' : t(SCOPE_LABEL[scope]);

  const Row = ({ r }: { r: BoardRow }) => {
    const u = users[r.userId];
    const title = TITLES.find(x => x.id === u?.titleId)?.name;
    return (
      <li className={`lbrow ${r.userId === ME ? 'is-me' : ''}`}>
        <span className="rank tnum" aria-label={t('Rank {n}', { n: r.rank })}>{r.tied ? '=' : ''}{r.rank}</span>
        <button type="button" className="lb-person" onClick={() => go({ name: 'profile', userId: r.userId })}>
          <Avatar userId={r.userId} size={36} />
          <span className="person-text"><b dir="auto">{u?.name}{r.userId === ME ? ` (${t('you')})` : ''}</b>{title && <em>{title}</em>}</span>
        </button>
        {metric === 'popularity' && r.boosted > 0 && <Tag tone="outline" icon={Zap} className="hide-xs">{t('{n} Boosted', { n: fmt(r.boosted) })}</Tag>}
        <b className="lb-score"><ScoreText metric={metric} value={r.score} /> <span className="meta">{t(M.unit)}</span></b>
      </li>
    );
  };

  return (
    <>
      <ScreenHeader icon={<Trophy size={20} />} title={t('Leaderboards')} subtitle={t('Ranks are calculated from the records shown, after filtering.')} />
      <div className="scroll"><div className="page page-wide">
        <Tabs tabs={(Object.keys(METRIC) as BoardMetric[]).map(m => ({ value: m, label: t(METRIC[m].label) }))} value={metric} onChange={v => { setMetric(v); setLimit(PAGE); }} label={t('Metric')} idBase="lb" className="tabs-line" />
        <TabPanel idBase="lb" value={metric}>
          <div className="lb-filters">
            <RadioList name="lb-scope" legend={t('Scope')} variant="segmented" value={scope} onChange={v => { setScope(v); setLimit(PAGE); }} options={(['global', 'city', 'server', 'friends'] as BoardScope[]).map(s => ({ value: s, label: t(SCOPE_LABEL[s]) }))} />
            {scope === 'city' && <Select label={t('City')} value={city} onValue={setCity} options={cities.map(c => [c, c] as const)} />}
            {scope === 'server' && <Select label={t('Community')} value={serverId} onValue={setServerId} options={joined.map(id => [id, servers[id]?.name ?? id] as const)} />}
            <RadioList name="lb-period" legend={t('Period')} variant="segmented" value={period} onChange={v => { setPeriod(v); setLimit(PAGE); }} options={(['daily', 'weekly', 'all'] as BoardPeriod[]).map(p => ({ value: p, label: t(PERIOD_LABEL[p]) }))} />
          </div>
          <p className="meta row g8 lb-bounds"><Clock size={14} aria-hidden="true" />{boundary} · {t('Asia/Karachi time (PKT, UTC+5)')} · {t('Updated {time}', { time: formatKarachi(now, { hour: 'numeric', minute: '2-digit' }, locale) })}{scope === 'server' && metric === 'popularity' ? ' · ' + t('Only points earned in this community count.') : ''}</p>

          <div className={`lb-me ${board.me ? '' : 'is-unranked'}`} role="status">
            <Avatar userId={ME} size={32} />
            <span className="grow">{board.me ? t('You’re #{n} in {scope} · {period}', { n: board.me.rank, scope: scopeLabel, period: t(PERIOD_LABEL[period]) }) : t('Not ranked in {scope} · {period}: no qualifying activity yet.', { scope: scopeLabel, period: t(PERIOD_LABEL[period]) })}</span>
            {board.me && <b><ScoreText metric={metric} value={board.me.score} /> <span className="meta">{t(M.unit)}</span></b>}
          </div>

          {board.rows.length === 0 ? <Empty icon={M.icon} title={t('No rankings yet')}>{t('No one has qualifying activity for this scope and period.')}</Empty> : (
            <>
              <ol className="podium" aria-label={t('Top three')}>
                {top.map(r => (
                  <li key={r.userId} className={`pod pod-${r.rank} ${r.userId === ME ? 'is-me' : ''}`}>
                    <Medal rank={Math.min(3, r.rank) as 1 | 2 | 3} size={32} />
                    <Avatar userId={r.userId} size={48} />
                    <button type="button" className="pod-name" onClick={() => go({ name: 'profile', userId: r.userId })}><b className="ellip" dir="auto">{users[r.userId]?.name}</b></button>
                    <span className="pod-score"><M.icon size={14} aria-hidden="true" /><ScoreText metric={metric} value={r.score} /></span>
                    {metric === 'popularity' && r.boosted > 0 && <span className="meta">{t('{n} Boosted', { n: fmt(r.boosted) })}</span>}
                  </li>
                ))}
              </ol>
              <ol className="lblist" aria-label={t('Rankings')}>{rest.map(r => <Row key={r.userId} r={r} />)}</ol>
              {board.rows.length > limit && <Button variant="ghost" block onClick={() => setLimit(l => l + PAGE)}>{t('Show more')}</Button>}
              <p className="meta mt16">{t('Ties share a rank and are listed alphabetically. Lifetime popularity never resets when you change the period.')}</p>
            </>
          )}
        </TabPanel>
      </div></div>
    </>
  );
}
