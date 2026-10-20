import { useMemo, useState, type FormEvent } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  Users, MessageSquare, Phone, MoreHorizontal, UserPlus, Check, X, PhoneIncoming, PhoneOutgoing, PhoneMissed, Video, History, LayoutGrid, Compass, Plus, Heart, Eye, EyeOff,
  Search, FileText, RotateCw, UserMinus, Ban, Star,
} from 'lucide-react';
import { useApp } from '@/state/store';
import { shownPresenceFor } from '@/state/selectors';
import { go, openModal } from '@/state/actions/ui';
import { acceptRequest, declineRequest, cancelRequest, sendRequest, removeFriend, block, unblock, dmWith, toggleCloseFriend, respondRelationship, removeRelationship, setRelationshipVisible, simulateTheirAnswer, resendFromLog, type AddFriendResult } from '@/state/actions/social';
import { rejoin } from '@/state/actions/community';
import { startCall } from '@/state/actions/calls';
import { useT, useLocale, msg, type Key } from '@/i18n';
import { relTime, formatKarachi } from '@/domain/time';
import { duration, kfmt } from '@/domain/format';
import { matchScore } from '@/domain/search';
import type { FriendsTab } from '@/state/types';
import type { RelationshipType } from '@/types/models';
import { ScreenHeader } from '@/shell/Shell';
import { Avatar, PresenceLabel } from '@/ui/Avatar';
import { CommunityIcon } from '@/ui/Art';
import { Button, IconButton } from '@/ui/Button';
import { Empty, Tag, Note, DemoTag } from '@/ui/Misc';
import { Tabs, TabPanel, TextField, Toggle } from '@/ui/Form';
import { Menu, useMenu } from '@/ui/Overlay';
import { StoriesRow } from './Inbox';
import { ME } from '@/fixtures/users';

export const REL_LABEL: Record<RelationshipType, Key> = { partner: msg('Partner'), 'best-friend': msg('Best friend'), sibling: msg('Sibling'), friend: msg('Friend'), cousin: msg('Cousin'), mentor: msg('Mentor') };

/* ---------------- Friends ---------------- */
function FriendRow({ id, kind }: { id: string; kind: 'friend' | 'in' | 'out' | 'blocked' | 'search' }) {
  const t = useT();
  const u = useApp(s => s.users[id]);
  const presence = useApp(s => shownPresenceFor(s, id));
  const now = useApp(s => s.now);
  const close = useApp(s => s.closeFriends.includes(id));
  const isFriend = useApp(s => s.friends.includes(id));
  const menu = useMenu();
  if (!u) return null;
  const sub = presence === 'offline' ? (u.hideLastSeen ? t('Last seen hidden') : u.lastSeenAt ? t('Last seen {when}', { when: relTime(u.lastSeenAt, now) }) : t('Offline')) : u.activity ? u.activity.label : '';
  return (
    <li className="frow">
      <button type="button" className="frow-main" onClick={() => go({ name: 'profile', userId: id })}>
        <Avatar userId={id} size={36} showPresence={kind !== 'blocked'} />
        <span className="person-text"><b dir="auto">{u.name}</b><em className="ltr-start">@{u.handle}</em>{kind !== 'blocked' && <span className="row g8 meta"><PresenceLabel kind={presence} />{sub && <span className="ellip">· {sub}</span>}</span>}</span>
        {close && <Tag tone="green" icon={Star}>{t('Close friend')}</Tag>}
      </button>
      <div className="row g4">
        {kind === 'friend' && <>
          <IconButton icon={MessageSquare} label={t('Message {name}', { name: u.name })} onClick={() => go({ name: 'dm', convId: dmWith(id) })} />
          <IconButton icon={Phone} label={t('Call {name}', { name: u.name })} onClick={() => { const c = dmWith(id); go({ name: 'dm', convId: c }); startCall(c); }} />
          <IconButton icon={MoreHorizontal} label={t('More')} aria-haspopup="menu" onClick={e => menu.open(e.currentTarget)} />
        </>}
        {kind === 'in' && <><Button size="sm" variant="primary" icon={Check} onClick={() => acceptRequest(id)}>{t('Accept')}</Button><Button size="sm" icon={X} onClick={() => declineRequest(id)}>{t('Decline')}</Button></>}
        {kind === 'out' && <Button size="sm" onClick={() => cancelRequest(id)}>{t('Cancel request')}</Button>}
        {kind === 'blocked' && <Button size="sm" onClick={() => unblock(id)}>{t('Unblock')}</Button>}
        {kind === 'search' && !isFriend && <Button size="sm" icon={UserPlus} onClick={() => sendRequest(u.handle)}>{t('Add friend')}</Button>}
      </div>
      {menu.isOpen && <Menu label={t('Friend options')} anchor={menu.anchor} onClose={menu.close} items={[
        { id: 'profile', label: t('View profile'), onSelect: () => go({ name: 'profile', userId: id }) },
        { id: 'close', label: close ? t('Remove from close friends') : t('Add to close friends'), icon: <Star size={16} />, onSelect: () => toggleCloseFriend(id) },
        { id: 'video', label: t('Video call'), icon: <Video size={16} />, onSelect: () => { const c = dmWith(id); go({ name: 'dm', convId: c }); startCall(c, true); } },
        'sep',
        { id: 'remove', label: t('Remove friend'), icon: <UserMinus size={16} />, danger: true, onSelect: () => removeFriend(id) },
        { id: 'block', label: t('Block'), icon: <Ban size={16} />, danger: true, onSelect: () => block(id) },
      ]} />}
    </li>
  );
}

function AddFriend() {
  const t = useT();
  const [v, setV] = useState('');
  const [res, setRes] = useState<AddFriendResult | null>(null);
  const errText = (r: AddFriendResult) => r.ok ? null : ({
    empty: t('Enter a username.'), self: t('That’s you.'), unknown: r.suggestion ? t('No one has that username. Did you mean @{s}?', { s: r.suggestion }) : t('No one has that username. Check the spelling.'),
    already: t('You’re already friends.'), pending: t('A request is already pending.'), blocked: t('You blocked this person. Unblock them first.'),
  } as const)[r.error];
  const submit = (e: FormEvent) => { e.preventDefault(); const r = sendRequest(v); setRes(r); if (r.ok) setV(''); };
  return (
    <form className="addfriend" onSubmit={submit} noValidate>
      <TextField label={t('Add a friend by username')} prefix="@" value={v} onChange={e => { setV(e.target.value); setRes(null); }} error={res ? errText(res) : null} ok={res?.ok ? t('Request sent.') : null} autoComplete="off" spellCheck={false} placeholder="username" className="grow" />
      <Button type="submit" variant="primary" icon={UserPlus}>{t('Send request')}</Button>
    </form>
  );
}

export function Friends({ tab }: { tab: FriendsTab }) {
  const t = useT();
  const friends = useApp(s => s.friends);
  const requests = useApp(s => s.requests);
  const blocked = useApp(s => s.blocked);
  const presence = useApp(useShallow(s => Object.fromEntries(s.friends.map(f => [f, shownPresenceFor(s, f)]))));
  const users = useApp(s => s.users);
  const [q, setQ] = useState('');
  const online = friends.filter(f => presence[f] !== 'offline').sort((a, b) => (users[a]?.name ?? '').localeCompare(users[b]?.name ?? ''));
  const all = [...friends].sort((a, b) => {
    const pa = presence[a] === 'offline' ? 1 : 0, pb = presence[b] === 'offline' ? 1 : 0;
    return pa - pb || (users[b]?.lastSeenAt ?? 0) - (users[a]?.lastSeenAt ?? 0);
  });
  const filt = (ids: string[]) => ids.filter(id => !q.trim() || matchScore(q, [users[id]?.name ?? '', users[id]?.handle ?? '']) > 0);
  const people = useMemo(() => (q.trim().length >= 2 ? Object.values(users).filter(u => u.id !== ME && !u.bot && !blocked.includes(u.id) && !friends.includes(u.id) && matchScore(q, [u.name, u.handle]) > 0) : []), [q, users, blocked, friends]);
  const incoming = requests.filter(r => r.direction === 'in');
  const outgoing = requests.filter(r => r.direction === 'out');
  const tabs: { value: FriendsTab; label: string; count?: number }[] = [
    { value: 'online', label: t('Online'), count: online.length }, { value: 'all', label: t('All') }, { value: 'pending', label: t('Pending'), count: incoming.length }, { value: 'blocked', label: t('Blocked') },
  ];
  return (
    <>
      <ScreenHeader icon={<Users size={20} />} title={t('Friends')} subtitle={t('{a} online · {b} friends', { a: online.length, b: friends.length })} />
      <div className="scroll"><div className="page">
        <StoriesRow />
        <AddFriend />
        <Tabs tabs={tabs} value={tab} onChange={v => go({ name: 'friends', tab: v }, { replace: true })} label={t('Friends')} idBase="friends" className="tabs-line" />
        <TabPanel idBase="friends" value={tab}>
          {(tab === 'online' || tab === 'all') && <TextField label={t('Search friends and people')} srLabel icon={Search} placeholder={t('Search friends and people')} value={q} onChange={e => setQ(e.target.value)} className="mt16" />}
          {tab === 'online' && (filt(online).length ? <ul className="flist">{filt(online).map(id => <FriendRow key={id} id={id} kind="friend" />)}</ul> : <Empty icon={Users} title={t('No friends online')}>{t('Friends who are online or idle show here.')}</Empty>)}
          {tab === 'all' && <><p className="meta mt8">{t('Sorted by last seen. People who hide their last seen show as hidden.')}</p><ul className="flist">{filt(all).map(id => <FriendRow key={id} id={id} kind="friend" />)}</ul></>}
          {(tab === 'online' || tab === 'all') && people.length > 0 && <><h3 className="label mt24">{t('Other people')}</h3><ul className="flist">{people.slice(0, 10).map(u => <FriendRow key={u.id} id={u.id} kind="search" />)}</ul></>}
          {tab === 'pending' && (incoming.length + outgoing.length ? <>
            {incoming.length > 0 && <><h3 className="label mt16">{t('Received — {n}', { n: incoming.length })}</h3><ul className="flist">{incoming.map(r => <FriendRow key={r.userId} id={r.userId} kind="in" />)}</ul></>}
            {outgoing.length > 0 && <><h3 className="label mt16">{t('Sent — {n}', { n: outgoing.length })}</h3><ul className="flist">{outgoing.map(r => <FriendRow key={r.userId} id={r.userId} kind="out" />)}</ul></>}
          </> : <Empty icon={UserPlus} title={t('No pending requests')} />)}
          {tab === 'blocked' && (blocked.length ? <ul className="flist">{blocked.map(id => <FriendRow key={id} id={id} kind="blocked" />)}</ul> : <Empty icon={Ban} title={t('You haven’t blocked anyone')} />)}
        </TabPanel>
      </div></div>
    </>
  );
}

/* ---------------- Calls (SOC-05) ---------------- */
export function Calls() {
  const t = useT();
  const locale = useLocale();
  const calls = useApp(s => s.calls);
  const convs = useApp(s => s.conversations);
  const users = useApp(s => s.users);
  const [tab, setTab] = useState<'all' | 'missed'>('all');
  const list = calls.filter(c => tab === 'all' || c.missed).sort((a, b) => b.startedAt - a.startedAt);
  return (
    <>
      <ScreenHeader icon={<Phone size={20} />} title={t('Calls')} subtitle={t('1:1 and group calls')} actions={<DemoTag>{t('Demo calls')}</DemoTag>} />
      <div className="scroll"><div className="page">
        <Tabs tabs={[{ value: 'all', label: t('All') }, { value: 'missed', label: t('Missed'), count: calls.filter(c => c.missed).length }]} value={tab} onChange={setTab} label={t('Filter calls')} idBase="calls" className="tabs-line" />
        <TabPanel idBase="calls" value={tab}>
          {list.length ? <ul className="flist">{list.map(c => {
            const conv = convs[c.convId];
            const others = c.participants.filter(p => p !== ME);
            const name = conv?.kind === 'group' ? conv.name ?? '' : users[others[0] ?? '']?.name ?? '';
            const I = c.missed ? PhoneMissed : c.direction === 'in' ? PhoneIncoming : PhoneOutgoing;
            return (
              <li key={c.id} className="frow">
                <div className="frow-main">
                  {conv?.kind === 'group' ? <span className="av-group" aria-hidden="true">{others.slice(0, 2).map(o => <Avatar key={o} userId={o} size={28} />)}</span> : <Avatar userId={others[0] ?? ME} size={40} />}
                  <span className="person-text">
                    <b className={c.missed ? 'bad' : ''} dir="auto">{name}</b>
                    <span className="meta row g8"><I size={14} aria-hidden="true" className={c.missed ? 'bad' : ''} />
                      {c.missed ? t('Missed') : c.direction === 'in' ? t('Incoming') : t('Outgoing')} · {c.video ? t('Video') : t('Voice')}{c.durationSec ? ` · ${duration(c.durationSec)}` : ''}{others.length > 1 ? ` · ${t('{n} people', { n: c.participants.length })}` : ''}
                    </span>
                  </span>
                  <span className="meta">{formatKarachi(c.startedAt, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }, locale)}</span>
                </div>
                <IconButton icon={c.video ? Video : Phone} label={t('Call back {name}', { name })} onClick={() => { go({ name: 'dm', convId: c.convId }); startCall(c.convId, c.video); }} />
              </li>
            );
          })}</ul> : <Empty icon={Phone} title={t('No calls')}>{t('Calls you make or receive show here.')}</Empty>}
        </TabPanel>
      </div></div>
    </>
  );
}

/* ---------------- Activity log (SOC-08) ---------------- */
export function Logs() {
  const t = useT();
  const locale = useLocale();
  const logs = useApp(s => s.userLogs);
  const users = useApp(s => s.users);
  const servers = useApp(s => s.servers);
  const dir = useApp(s => s.directory);
  const joined = useApp(s => s.joined);
  return (
    <>
      <ScreenHeader icon={<History size={20} />} title={t('Activity log')} subtitle={t('Private to you. No one is notified.')} />
      <div className="scroll"><div className="page">
        <Note>{t('This log shows who removed you as a friend and communities you left. It never sends push alerts.')}</Note>
        {logs.length ? <ul className="flist mt16">{logs.map(l => {
          const isUser = l.kind === 'unfriended-by';
          const label = isUser ? users[l.ref]?.name ?? l.ref : servers[l.ref]?.name ?? dir.find(d => d.id === l.ref)?.name ?? l.ref;
          const back = !isUser && joined.includes(l.ref);
          return (
            <li key={l.id} className="frow">
              <div className="frow-main">
                {isUser ? <Avatar userId={l.ref} size={40} /> : <CommunityIcon id={l.ref} name={label} color={servers[l.ref]?.color ?? dir.find(d => d.id === l.ref)?.color ?? '#949BA8'} size={40} />}
                <span className="person-text"><b dir="auto">{isUser ? t('{name} removed you as a friend', { name: label }) : t('You left {name}', { name: label })}</b><span className="meta">{formatKarachi(l.at, { dateStyle: 'medium' }, locale)}</span></span>
              </div>
              {l.resolved || back ? <Tag tone="green" icon={Check}>{isUser ? t('Request sent') : t('Rejoined')}</Tag>
                : isUser ? <Button size="sm" icon={UserPlus} onClick={() => resendFromLog(l.id)}>{t('Send request')}</Button>
                : <Button size="sm" icon={RotateCw} onClick={() => rejoin(l.ref)}>{t('Rejoin')}</Button>}
            </li>
          );
        })}</ul> : <Empty icon={History} title={t('Nothing logged')} />}
      </div></div>
    </>
  );
}

/* ---------------- Communities ---------------- */
export function Communities() {
  const t = useT();
  const joined = useApp(s => s.joined);
  const servers = useApp(s => s.servers);
  const appId = useApp(s => s.myApplicationId);
  const app = useApp(s => s.applications.find(a => a.id === s.myApplicationId));
  return (
    <>
      <ScreenHeader icon={<LayoutGrid size={20} />} title={t('Communities')} subtitle={t('{n} joined', { n: joined.length })}
        actions={<Button size="sm" variant="primary" icon={Plus} onClick={() => openModal({ kind: 'createCommunity' })}>{t('Create')}</Button>} />
      <div className="scroll"><div className="page page-wide">
        {appId && app && (
          <section className="panel panel-pad app-status" aria-label={t('Your server application')}>
            <div className="row g12 wrap"><FileText size={20} aria-hidden="true" /><b className="grow">{t('Application: {name}', { name: app.name })}</b>
              <Tag tone={app.status === 'approved' ? 'green' : app.status === 'rejected' ? 'red' : app.status === 'changes-requested' ? 'amber' : 'info'}>{t(({ pending: msg('Under review'), approved: msg('Approved'), rejected: msg('Rejected'), 'changes-requested': msg('Changes requested') } as const)[app.status])}</Tag></div>
            {app.status === 'pending' && <p className="muted small mt8">{t('The team replies within 72 hours. You’ll get an Inbox message.')}</p>}
            {app.status === 'changes-requested' && <><p className="small mt8">{app.notes.at(-1)?.text}</p><Button size="sm" className="mt8" onClick={() => openModal({ kind: 'apply' })}>{t('Edit and resubmit')}</Button></>}
          </section>
        )}
        <ul className="comm-grid">
          {joined.map(id => { const sv = servers[id]!; return (
            <li key={id}>
              <button type="button" className="comm-card" onClick={() => go({ name: 'channel', serverId: id, channelId: sv.categories.flatMap(c => c.channelIds)[0] ?? '' })}>
                <CommunityIcon id={sv.id} name={sv.name} color={sv.color} style={sv.bannerStyle} size={48} />
                <span className="grow col"><b className="ellip" dir="auto">{sv.name}</b><span className="meta">{sv.kind === 'room' ? t('Room · unlisted') : sv.category} · {t('{n} members', { n: kfmt(sv.members) })}</span><span className="small muted clamp2">{sv.description}</span></span>
              </button>
            </li>
          ); })}
        </ul>
        <div className="row g8 wrap mt24">
          <Button icon={Compass} onClick={() => go({ name: 'discover', cat: 'all' })}>{t('Discover communities')}</Button>
          <Button icon={FileText} onClick={() => openModal({ kind: 'apply' })}>{t('Apply for a server')}</Button>
          <Button icon={UserPlus} onClick={() => openModal({ kind: 'joinInvite' })}>{t('Join with an invite')}</Button>
        </div>
      </div></div>
    </>
  );
}

/* ---------------- Relationships (SOC-09) ---------------- */
export function Relationships() {
  const t = useT();
  const rels = useApp(s => s.relationships);
  const users = useApp(s => s.users);
  const minor = useApp(s => s.ageGroup === 'minor');
  const accepted = rels.filter(r => r.state === 'accepted');
  const incoming = rels.filter(r => r.state === 'pending-in');
  const outgoing = rels.filter(r => r.state === 'pending-out');
  const declined = rels.filter(r => r.state === 'declined');
  return (
    <>
      <ScreenHeader icon={<Heart size={20} />} title={t('Relationships')} subtitle={t('Both people accept before anything shows')} actions={<Button size="sm" variant="primary" icon={Plus} onClick={() => openModal({ kind: 'relationship' })}>{t('Add')}</Button>} />
      <div className="scroll"><div className="page">
        {minor && <Note tone="info">{t('Partner relationships aren’t available on under-18 accounts.')}</Note>}
        {incoming.length > 0 && <section className="sec"><h3 className="sec-title">{t('Requests for you')}</h3><ul className="flist">{incoming.map(r => (
          <li key={r.id} className="frow"><div className="frow-main"><Avatar userId={r.with} size={40} /><span className="person-text"><b>{users[r.with]?.name}</b><span className="meta">{t('Wants to add you as {type}', { type: t(REL_LABEL[r.type]) })}</span></span></div>
            <Button size="sm" variant="primary" icon={Check} onClick={() => respondRelationship(r.id, true)} disabled={minor && r.type === 'partner'}>{t('Accept')}</Button><Button size="sm" icon={X} onClick={() => respondRelationship(r.id, false)}>{t('Decline')}</Button></li>
        ))}</ul></section>}
        <section className="sec"><h3 className="sec-title">{t('On your profile')}</h3>
          {accepted.length ? <ul className="flist">{accepted.map(r => (
            <li key={r.id} className="frow">
              <div className="frow-main"><Avatar userId={r.with} size={40} /><span className="person-text"><b>{users[r.with]?.name}</b><span className="meta">{t(REL_LABEL[r.type])} · {r.visible ? t('Shown on your profile') : t('Hidden from your profile')}</span></span></div>
              <IconButton icon={r.visible ? Eye : EyeOff} label={r.visible ? t('Hide from profile') : t('Show on profile')} pressed={!r.visible} onClick={() => setRelationshipVisible(r.id, !r.visible)} />
              <IconButton icon={X} label={t('Remove relationship')} onClick={() => removeRelationship(r.id)} />
            </li>
          ))}</ul> : <p className="meta">{t('No relationships yet.')}</p>}
          <p className="meta">{t('Each side controls its own visibility. Hiding it on your profile doesn’t hide it on theirs.')}</p>
        </section>
        {outgoing.length > 0 && <section className="sec"><h3 className="sec-title">{t('Waiting for a reply')}</h3><ul className="flist">{outgoing.map(r => (
          <li key={r.id} className="frow"><div className="frow-main"><Avatar userId={r.with} size={40} /><span className="person-text"><b>{users[r.with]?.name}</b><span className="meta">{t(REL_LABEL[r.type])} · {t('Pending')}</span></span></div>
            <DemoTag>{t('Simulate their answer')}</DemoTag><Button size="sm" onClick={() => simulateTheirAnswer(r.id, true)}>{t('Accepts')}</Button><Button size="sm" onClick={() => simulateTheirAnswer(r.id, false)}>{t('Declines')}</Button>
            <IconButton icon={X} label={t('Cancel request')} onClick={() => removeRelationship(r.id)} /></li>
        ))}</ul></section>}
        {declined.length > 0 && <section className="sec"><h3 className="sec-title">{t('Declined')}</h3><ul className="flist">{declined.map(r => <li key={r.id} className="frow"><div className="frow-main"><Avatar userId={r.with} size={32} /><span className="person-text"><b>{users[r.with]?.name}</b><span className="meta">{t(REL_LABEL[r.type])} · {t('Declined')}</span></span></div><IconButton icon={X} label={t('Remove')} onClick={() => removeRelationship(r.id)} /></li>)}</ul></section>}
        <hr className="mt24" />
        <Toggle label={t('Show relationships section on my profile')} checked={accepted.some(r => r.visible)} onChange={v => accepted.forEach(r => setRelationshipVisible(r.id, v))} description={t('Turns every relationship on or off at once.')} />
      </div></div>
    </>
  );
}
