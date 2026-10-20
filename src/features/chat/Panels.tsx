import { NO_FILTERS } from '@/domain/chatSearch';
import { Select } from '@/ui/Pickers';
import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { X, Search, Pin, MessagesSquare, SlidersHorizontal } from 'lucide-react';
import { useApp, EMPTY, update } from '@/state/store';
import { openModal, go } from '@/state/actions/ui';
import { useT, useLocale } from '@/i18n';
import { matchScore } from '@/domain/search';
import { formatKarachi } from '@/domain/time';
import { Avatar, PRESENCE_LABEL } from '@/ui/Avatar';
import { IconButton, Button } from '@/ui/Button';
import { Empty } from '@/ui/Misc';
import { TextField } from '@/ui/Form';
import { Markdown } from '@/ui/Markdown';
import { MessageList, RoleName } from './Messages';
import { Composer } from './Composer';
import { shownPresenceFor } from '@/state/selectors';

function PanelHead({ title, sub }: { title: string; sub?: string }) {
  const t = useT();
  return (
    <div className="panel-head">
      <div className="grow"><h2 className="ellip">{title}</h2>{sub && <p className="meta ellip">{sub}</p>}</div>
      <IconButton icon={X} label={t('Close panel')} onClick={() => useApp.setState(s => { s.rightPanel = null; s.threadKey = null; })} />
    </div>
  );
}

export function ThreadPanel() {
  const t = useT();
  const tid = useApp(s => s.threadKey);
  const thread = useApp(s => (tid ? s.threads[tid] : undefined));
  const parent = useApp(s => (thread ? s.messages[thread.channelId]?.find(m => m.id === thread.parentId) : undefined));
  const channel = useApp(s => (thread ? s.channels[thread.channelId] : undefined));
  if (!thread || !parent || !channel) return <aside className="right is-thread"><PanelHead title={t('Thread')} /><Empty icon={MessagesSquare} title={t('Thread not found')} /></aside>;
  const messages = [parent, ...thread.messages];
  return (
    <aside className="right is-thread" aria-label={t('Thread')}>
      <PanelHead title={t('Thread')} sub={'#' + channel.name} />
      <div className="chatcol">
        <MessageList k={{ scope: 'thread', id: thread.id }} messages={messages} serverId={channel.serverId} inThread />
        <Composer k={{ scope: 'thread', id: thread.id }} serverId={channel.serverId} placeholder={t('Reply in thread')} />
      </div>
    </aside>
  );
}

export function MembersPanel({ serverId }: { serverId: string }) {
  const t = useT();
  const sv = useApp(s => s.servers[serverId]);
  const presence = useApp(useShallow(s => Object.fromEntries((sv?.memberList ?? []).map(m => [m.userId, shownPresenceFor(s, m.userId)]))));
  const users = useApp(s => s.users);
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(40);
  const groups = useMemo(() => {
    if (!sv) return [];
    const hoisted = sv.roles.filter(r => r.categoryId === 'staff' && !r.system).sort((a, b) => a.position - b.position);
    const seen = new Set<string>();
    const out: { title: string; ids: string[] }[] = [];
    const matches = (id: string) => !q.trim() || matchScore(q, [users[id]?.name ?? '', users[id]?.handle ?? '']) > 0;
    for (const r of hoisted) {
      const ids = sv.memberList.filter(m => m.roleIds.includes(r.id) && !seen.has(m.userId) && presence[m.userId] !== 'offline' && matches(m.userId)).map(m => m.userId);
      ids.forEach(i => seen.add(i));
      if (ids.length) out.push({ title: r.name, ids });
    }
    const online = sv.memberList.filter(m => !seen.has(m.userId) && presence[m.userId] !== 'offline' && matches(m.userId)).map(m => m.userId);
    const offline = sv.memberList.filter(m => !seen.has(m.userId) && presence[m.userId] === 'offline' && matches(m.userId)).map(m => m.userId);
    if (online.length) out.push({ title: t('Online'), ids: online });
    if (offline.length) out.push({ title: t('Offline'), ids: offline });
    return out;
  }, [sv, presence, users, q, t]);
  if (!sv) return null;
  let shown = 0;
  return (
    <aside className="right" aria-label={t('Members')}>
      <PanelHead title={t('Members')} sub={t('{n} members', { n: sv.members.toLocaleString() })} />
      <div className="pad12"><TextField label={t('Search members')} srLabel icon={Search} placeholder={t('Search members')} value={q} onChange={e => setQ(e.target.value)} /></div>
      <div className="scroll members">
        {groups.map(g => {
          const ids = g.ids.slice(0, Math.max(0, limit - shown));
          shown += ids.length;
          if (!ids.length) return null;
          return (
            <section key={g.title} aria-label={`${g.title}, ${g.ids.length}`}>
              <h3 className="label member-group">{g.title} — {g.ids.length}</h3>
              <ul>{ids.map(id => (
                <li key={id}>
                  <button type="button" className={`person ${presence[id] === 'offline' ? 'is-offline' : ''}`} onClick={() => openModal({ kind: 'memberCard', serverId, userId: id })}
                    aria-label={`${users[id]?.name}, ${t(PRESENCE_LABEL[presence[id] ?? 'offline'])}`}>
                    <Avatar userId={id} size={32} showPresence />
                    <span className="person-text"><RoleName userId={id} serverId={serverId} />{users[id]?.activity && <em className="ellip">{users[id]!.activity!.label}</em>}</span>
                  </button>
                </li>
              ))}</ul>
            </section>
          );
        })}
        {groups.reduce((n, g) => n + g.ids.length, 0) > limit && <div className="pad12"><Button size="sm" variant="ghost" block onClick={() => setLimit(l => l + 40)}>{t('Show more members')}</Button></div>}
        {!groups.length && <p className="meta pad16">{t('No members match.')}</p>}
        <p className="meta pad16">{t('Showing members loaded on this device. Large communities list online members first.')}</p>
      </div>
    </aside>
  );
}

export function SearchPanel({ channelId, convId }: { channelId?: string; convId?: string }) {
  const t = useT();
  const locale = useLocale();
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const list = useApp(s => (channelId ? s.messages[channelId] ?? EMPTY : convId ? s.conversations[convId]?.messages ?? EMPTY : EMPTY));
  const users = useApp(s => s.users);
  const e2ee = useApp(s => (channelId ? !!s.servers[s.channels[channelId]?.serverId ?? '']?.e2ee : false));
  const hits = list.filter(m => !m.system && (!q.trim() || matchScore(q, [m.text]) > 0) && (!from || m.author === from) && (q.trim() || from));
  return (
    <aside className="right" aria-label={t('Search')}>
      <PanelHead title={t('Search')} sub={convId ? t('Searches this device’s copy of the conversation') : undefined} />
      <div className="pad12 col g8">
        <TextField label={t('Search messages')} icon={Search} value={q} onChange={e => setQ(e.target.value)} autoFocus placeholder={t('Words, names…')} />
        <Select label={t('From')} value={from} onValue={setFrom} options={[['', t('Anyone')] as const, ...[...new Set(list.map(m => m.author))].filter(a => users[a]).map(a => [a, users[a]!.name] as const)]} />
        {e2ee && <p className="meta">{t('Search is off in encrypted communities.')}</p>}
        <Button size="sm" variant="ghost" icon={SlidersHorizontal} onClick={() => { update(s => { s.chatSearch = { ...NO_FILTERS, q, sender: from, conv: channelId ? `channel:${channelId}` : convId ? `dm:${convId}` : '' }; }); go({ name: 'search' }); }}>{t('Search with filters')}</Button>
      </div>
      <div className="scroll" aria-live="polite">
        {(q.trim() || from) && <p className="meta pad12">{t('{n} results', { n: hits.length })}</p>}
        <ul className="search-hits">{hits.slice(0, 50).map(m => (
          <li key={m.id} className="hit"><div className="row g8"><Avatar userId={m.author} size={24} /><b>{users[m.author]?.name}</b><span className="meta">{formatKarachi(m.at, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }, locale)}</span></div><p className="small"><Markdown text={m.text} /></p></li>
        ))}</ul>
      </div>
    </aside>
  );
}

export function PinsPanel({ channelId }: { channelId: string }) {
  const t = useT();
  const pins = useApp(useShallow(s => (s.messages[channelId] ?? []).filter(m => m.pinned)));
  const users = useApp(s => s.users);
  const sid = useApp(s => s.channels[channelId]?.serverId);
  return (
    <aside className="right" aria-label={t('Pinned messages')}>
      <PanelHead title={t('Pinned messages')} />
      <div className="scroll">
        {pins.length ? <ul className="search-hits">{pins.map(m => <li key={m.id} className="hit"><div className="row g8"><Avatar userId={m.author} size={24} /><b>{users[m.author]?.name}</b></div><p className="small"><Markdown text={m.text} serverId={sid} /></p></li>)}</ul>
          : <Empty icon={Pin} title={t('No pinned messages')}>{t('Moderators can pin important messages from the message menu.')}</Empty>}
      </div>
    </aside>
  );
}
