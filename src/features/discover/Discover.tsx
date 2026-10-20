import { useShallow } from 'zustand/react/shallow';
import { useMemo, useState } from 'react';
import { Compass, Search, Plus, Volume2, Check, Bot, MapPin, Users, Flame, ThumbsUp } from 'lucide-react';
import { useApp } from '@/state/store';
import { go, openModal } from '@/state/actions/ui';
import { joinDirectory } from '@/state/actions/community';
import { toggleBot } from '@/state/actions/portal';
import { useT } from '@/i18n';
import { matchScore } from '@/domain/search';
import { kfmt, fmt } from '@/domain/format';
import type { DirectoryEntry } from '@/fixtures/communities';
import { ScreenHeader } from '@/shell/Shell';
import { Art, CommunityIcon } from '@/ui/Art';
import { Button } from '@/ui/Button';
import { Empty, Tag, Note } from '@/ui/Misc';
import { RadioList, Select, TextField } from '@/ui/Form';
import { DISCOVER_CATS } from './DiscoverSidebar';

/** DIS-02/03 sample popularity score: active members + voice activity + growth (report penalty not modelled). */
export const discoverScore = (e: DirectoryEntry) => e.online * 2 + e.activity * 40 + e.growth * 60;
type Sort = 'popular' | 'growing' | 'active' | 'newest';

function Card({ e }: { e: DirectoryEntry }) {
  const t = useT();
  const joined = useApp(s => s.joined.includes(e.id));
  return (
    <li className="dcard">
      <div className="dcard-banner"><Art seed={e.id + 'b'} color={e.color} w={400} h={110} /><CommunityIcon id={e.id} name={e.name} color={e.color} size={48} className="dcard-icon" /></div>
      <div className="dcard-body">
        <div className="row g8 wrap"><h3 className="ellip grow" dir="auto">{e.name}</h3><Tag>{e.category}</Tag></div>
        <p className="small muted clamp2">{e.description}</p>
        <p className="meta row g12 wrap">
          <span className="row g4"><Flame size={14} aria-hidden="true" />{t('Popularity {n}', { n: kfmt(discoverScore(e)) })}</span>
          <span className="row g4"><Users size={14} aria-hidden="true" />{t('{n} members', { n: kfmt(e.members) })}</span>
          <span className="row g4"><span className="dot-on" aria-hidden="true" />{t('{n} online', { n: fmt(e.online) })}</span>
          <span className="row g4"><MapPin size={14} aria-hidden="true" />{e.city} · {e.language}</span>
        </p>
        <div className="row g8">
          {joined ? <Button size="sm" icon={Check} onClick={() => go({ name: 'channel', serverId: e.id, channelId: `${e.id}-general` })}>{t('Open')}</Button> : <Button size="sm" variant="primary" icon={Plus} onClick={() => joinDirectory(e.id)}>{t('Join')}</Button>}
          {e.liveNow && <Tag tone="green" icon={Volume2}>{t('Live: {name}', { name: e.liveNow })}</Tag>}
        </div>
      </div>
    </li>
  );
}

function BotDirectory() {
  const t = useT();
  const bots = useApp(s => s.bots);
  const users = useApp(s => s.users);
  return (
    <>
      <Note>{t('Bots only get the permissions you approve when adding them in Community settings. Developer apps use demo credentials here.')}</Note>
      <ul className="comm-grid">{bots.filter(b => b.listed).map(b => (
        <li key={b.id} className="comm-card is-static">
          <span className="ibubble"><Bot size={20} aria-hidden="true" /></span>
          <span className="grow col g4"><b>{b.name}</b><span className="meta">{t('by {name}', { name: users[b.by]?.name ?? b.by })}</span><span className="small muted">{b.description}</span><span className="meta">{t('Asks for: {perms}', { perms: b.perms.join(', ') })}</span>
            <Button size="sm" variant={b.added ? 'secondary' : 'primary'} onClick={() => toggleBot(b.id)} className="mt8">{b.added ? t('Remove from The Club') : t('Add to The Club')}</Button></span>
        </li>
      ))}</ul>
    </>
  );
}

export function Discover({ cat }: { cat: string }) {
  const t = useT();
  const dir = useApp(s => s.directory);
  const joinedServers = useApp(useShallow(s => s.joined.map(id => s.servers[id]).filter(Boolean)));
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('popular');
  const [city, setCity] = useState('any');
  const [lang, setLang] = useState('any');
  const cities = useMemo(() => [...new Set(dir.map(d => d.city))].sort(), [dir]);
  const langs = useMemo(() => [...new Set(dir.map(d => d.language))].sort(), [dir]);
  const list = useMemo(() => dir.filter(d => d.listed)
    .filter(d => cat === 'all' || d.category === cat)
    .filter(d => city === 'any' || d.city === city || d.city === 'All cities')
    .filter(d => lang === 'any' || d.language === lang)
    .filter(d => !q.trim() || matchScore(q, [d.name, d.category, d.city, d.description]) > 0)
    .sort((a, b) => sort === 'popular' ? discoverScore(b) - discoverScore(a) : sort === 'growing' ? b.growth - a.growth : sort === 'active' ? b.activity - a.activity : b.createdAt - a.createdAt), [dir, cat, city, lang, q, sort]);
  const myCats = new Set(joinedServers.map(s => s!.category));
  const suggested = dir.filter(d => myCats.has(d.category) && !joinedServers.some(s => s!.id === d.id)).sort((a, b) => discoverScore(b) - discoverScore(a)).slice(0, 3);
  const live = dir.filter(d => d.liveNow).slice(0, 4);
  const label = DISCOVER_CATS.find(c => c[0] === cat)?.[1];
  if (cat === 'bots') return <><ScreenHeader icon={<Bot size={20} />} title={t('Bot directory')} backTo /><div className="scroll"><div className="page page-wide"><BotDirectory /></div></div></>;
  return (
    <>
      <ScreenHeader icon={<Compass size={20} />} title={label ? t(label) : t('Discover')} subtitle={t('Reviewed servers only. Rooms are never listed.')} backTo actions={<Button size="sm" icon={Plus} onClick={() => openModal({ kind: 'createCommunity' })}>{t('Start a community')}</Button>} />
      <div className="scroll"><div className="page page-wide">
        <div className="discover-bar">
          <TextField label={t('Search by name, tag or city')} srLabel icon={Search} placeholder={t('Search by name, tag or city')} value={q} onChange={e => setQ(e.target.value)} className="grow" />
          <Select label={t('City')} value={city} onValue={setCity} options={[['any', t('Any city')], ...cities.map(c => [c, c] as const)]} />
          <Select label={t('Language')} value={lang} onValue={setLang} options={[['any', t('Any language')], ...langs.map(c => [c, c] as const)]} />
        </div>
        <RadioList name="dsort" legend={t('Sort by')} variant="segmented" value={sort} onChange={setSort} options={[{ value: 'popular', label: t('Most popular') }, { value: 'growing', label: t('Growing') }, { value: 'active', label: t('Most active') }, { value: 'newest', label: t('Newest') }]} />
        {cat === 'all' && !q && (
          <>
            {suggested.length > 0 && <section className="sec"><h2 className="sec-title row g8"><ThumbsUp size={18} aria-hidden="true" />{t('Suggested for you')}</h2><p className="sec-desc">{t('Based on the kinds of communities you’ve joined.')}</p><ul className="dgrid">{suggested.map(e => <Card key={e.id} e={e} />)}</ul></section>}
            <section className="sec"><h2 className="sec-title">{t('Live now in voice')}</h2>
              <ul className="live-list">{live.map(e => <li key={e.id}><button type="button" className="live-row" onClick={() => joinDirectory(e.id)}><Volume2 size={18} aria-hidden="true" /><span className="grow"><b>{e.liveNow}</b><span className="meta block">{e.name}</span></span><span className="meta tnum"><span className="dot-on" aria-hidden="true" /> {t('{n} listening', { n: Math.round(e.online / 20) })}</span></button></li>)}</ul>
            </section>
          </>
        )}
        <section className="sec"><h2 className="sec-title">{t('{n} communities', { n: list.length })}</h2>
          {list.length ? <ul className="dgrid">{list.map(e => <Card key={e.id} e={e} />)}</ul> : <Empty icon={Compass} title={t('No communities match')}>{t('Try another city or language, or clear the search.')}</Empty>}
        </section>
      </div></div>
    </>
  );
}
