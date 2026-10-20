import { CHANNEL_ICONS } from '@/ui/ChannelIcons';
import { useRef, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  Inbox, Users, Phone, LayoutGrid, Flame, Trophy, History, Search, Plus, Hash, Volume2, Radio, MessagesSquare, Megaphone, Lock, ChevronDown,
  KeyRound, CircleDollarSign, Settings, Bell, LogOut, Link2, CalendarDays, Flag, BellOff, Compass, X, MoreHorizontal, Heart, Mic, MicOff, Video,
} from 'lucide-react';
import { useApp, update } from '@/state/store';
import { serverChannels, unreadForChannel, channelLocked, canManage } from '@/state/selectors';
import { go, openModal, setDrawer } from '@/state/actions/ui';
import { leaveServer, toggleServerMute, markServerRead } from '@/state/actions/community';
import { useT, type Key, msg } from '@/i18n';
import type { Channel } from '@/types/models';
import { Avatar } from '@/ui/Avatar';
import { Art, CommunityIcon } from '@/ui/Art';
import { IconButton } from '@/ui/Button';
import { Menu, useMenu } from '@/ui/Overlay';
import { usePhone } from '@/hooks/useMedia';
import { GharMark } from '@/ui/Brand';
import { fmt, kfmt } from '@/domain/format';
import { DiscoverSidebar } from '@/features/discover/DiscoverSidebar';
import { SettingsSidebar } from '@/features/settings/SettingsSidebar';
import { ServerSettingsSidebar } from '@/features/serverSettings/ServerSettingsSidebar';

export function NavItem({ icon, label, active, onClick, count, mention, muted, trailing, title }: { icon: ReactNode; label: ReactNode; active?: boolean; onClick: () => void; count?: number; mention?: boolean; muted?: boolean; trailing?: ReactNode; title?: string }) {
  return (
    <button type="button" className={`nav ${active ? 'is-active' : ''} ${count && !muted ? 'is-unread' : ''} ${muted ? 'is-muted' : ''}`} aria-current={active ? 'page' : undefined} onClick={onClick} title={title}>
      <span className="nav-icon" aria-hidden="true">{icon}</span>
      <span className="nav-label ellip" dir="auto">{label}</span>
      {trailing}
      {count ? <span className={`count tnum ${mention ? 'is-mention' : ''}`}>{count}</span> : null}
    </button>
  );
}

function DrawerCommunities() {
  const t = useT();
  const joined = useApp(s => s.joined);
  const servers = useApp(s => s.servers);
  const route = useApp(s => s.route);
  return (
    <div className="drawer-comms">
      <div className="row between drawer-head">
        <span className="row g8"><GharMark size={24} /><b>Ghar</b></span>
        <IconButton icon={X} label={t('Close navigation')} onClick={() => setDrawer(false)} />
      </div>
      <ul className="drawer-strip" aria-label={t('Your communities')}>
        {joined.map(id => { const sv = servers[id]!; const active = (route.name === 'channel' || route.name === 'events' || route.name === 'serverSettings') && route.serverId === id; return (
          <li key={id}><button type="button" className={`tile ${active ? 'is-active' : ''}`} aria-current={active ? 'page' : undefined} aria-label={sv.name} onClick={() => { const c = serverChannels(useApp.getState(), id).find(x => x.type === 'text' && !x.lock); go({ name: 'channel', serverId: id, channelId: c?.id ?? '' }); }}>
            <CommunityIcon id={sv.id} name={sv.name} color={sv.color} style={sv.bannerStyle} size={44} />
          </button></li>
        ); })}
        <li><button type="button" className="tile tile-ghost" aria-label={t('Discover communities')} onClick={() => go({ name: 'discover', cat: 'all' })}><Compass size={20} aria-hidden="true" /></button></li>
        <li><button type="button" className="tile tile-ghost" aria-label={t('Create a community')} onClick={() => openModal({ kind: 'createCommunity' })}><Plus size={20} aria-hidden="true" /></button></li>
      </ul>
    </div>
  );
}

export function Sidebar() {
  const route = useApp(s => s.route);
  const phone = usePhone();
  const t = useT();
  let body: ReactNode;
  if (route.name === 'channel' || route.name === 'events') body = <ServerSidebar serverId={route.serverId} />;
  else if (route.name === 'discover') body = <DiscoverSidebar />;
  else if (route.name === 'settings') body = <SettingsSidebar />;
  else if (route.name === 'serverSettings') body = <ServerSettingsSidebar serverId={route.serverId} />;
  else body = <HomeSidebar />;
  return (
    <aside className="side" aria-label={t('Section navigation')}>
      {phone && <DrawerCommunities />}
      {body}
    </aside>
  );
}

function HomeSidebar() {
  const t = useT();
  const route = useApp(s => s.route);
  const inboxUnread = useApp(s => s.inbox.filter(i => i.unread).length);
  const requests = useApp(s => s.requests.filter(r => r.direction === 'in').length);
  const missed = useApp(s => s.calls.filter(c => c.missed).length);
  const convs = useApp(useShallow(s => Object.values(s.conversations).sort((a, b) => (b.messages.at(-1)?.at ?? 0) - (a.messages.at(-1)?.at ?? 0)).map(c => c.id)));
  const items: [Key, ReactNode, () => void, boolean, number?][] = [
    [msg('Inbox'), <Inbox size={16} strokeWidth={1.4} />, () => go({ name: 'inbox' }), route.name === 'inbox', inboxUnread],
    [msg('Search messages'), <Search size={16} strokeWidth={1.4} />, () => go({ name: 'search' }), route.name === 'search'],
    [msg('Friends'), <Users size={16} strokeWidth={1.4} />, () => go({ name: 'friends', tab: 'online' }), route.name === 'friends', requests],
    [msg('Calls'), <Phone size={16} strokeWidth={1.4} />, () => go({ name: 'calls' }), route.name === 'calls', missed],
    [msg('Communities'), <LayoutGrid size={16} strokeWidth={1.4} />, () => go({ name: 'communities' }), route.name === 'communities'],
    [msg('Popularity'), <Flame size={16} strokeWidth={1.4} />, () => go({ name: 'popularity' }), route.name === 'popularity'],
    [msg('Leaderboards'), <Trophy size={16} strokeWidth={1.4} />, () => go({ name: 'leaderboards' }), route.name === 'leaderboards'],
    [msg('Relationships'), <Heart size={16} strokeWidth={1.4} />, () => go({ name: 'relationships' }), route.name === 'relationships'],
    [msg('Activity log'), <History size={16} strokeWidth={1.4} />, () => go({ name: 'logs' }), route.name === 'logs'],
  ];
  return (
    <>
      <div className="side-top">
        <h2 className="side-title">{t('Home')}</h2>
        <button type="button" className="side-search" onClick={() => openModal({ kind: 'quick' })}><Search size={16} aria-hidden="true" /><span className="grow">{t('Find or start a chat')}</span><kbd className="ltr">Ctrl K</kbd></button>
      </div>
      <nav className="side-scroll scroll" aria-label={t('Home')}>
        <div className="navgroup">{items.map(([label, icon, onClick, active, count]) => <NavItem key={label} icon={icon} label={t(label)} onClick={onClick} active={active} count={count} />)}</div>
        <div className="side-sect">
          <h3 className="label grow">{t('Direct messages')}</h3>
          <IconButton icon={Plus} size="sm" label={t('New group message')} onClick={() => openModal({ kind: 'groupDm' })} />
        </div>
        <ul className="dm-list">{convs.map(id => <li key={id}><DmRow convId={id} active={route.name === 'dm' && route.convId === id} /></li>)}</ul>
      </nav>
    </>
  );
}

function DmRow({ convId, active }: { convId: string; active: boolean }) {
  const t = useT();
  const c = useApp(s => s.conversations[convId]!);
  const other = useApp(s => (c.kind === 'dm' ? s.users[c.members[0]!] : undefined));
  const unread = c.messages.filter(m => m.at > c.lastReadAt && m.author !== 'me').length;
  const name = c.kind === 'group' ? c.name ?? t('Group') : other?.name ?? '';
  const sub = c.kind === 'group' ? t('{n} members', { n: c.members.length }) : other?.activity?.label ?? other?.customStatus?.text ?? '';
  return (
    <button type="button" className={`person ${active ? 'is-active' : ''} ${unread ? 'is-unread' : ''}`} data-ctx="conversation" data-id={convId} aria-current={active ? 'page' : undefined} onClick={() => go({ name: 'dm', convId })}
      aria-label={[name, unread ? t('{n} unread', { n: unread }) : ''].filter(Boolean).join(', ')}>
      {c.kind === 'group' ? <span className="av-group" aria-hidden="true">{c.members.filter(m => m !== 'me').slice(0, 2).map(m => <Avatar key={m} userId={m} size={28} />)}</span> : <Avatar userId={c.members[0]!} size={36} showPresence />}
      <span className="person-text"><b className="ellip" dir="auto">{name}</b>{sub && <em className="ellip" dir="auto">{sub}</em>}</span>
      {unread > 0 && <span className="count tnum" aria-hidden="true">{unread}</span>}
    </button>
  );
}

export const CHANNEL_ICON: Record<Channel['type'], typeof Hash> = { text: Hash, voice: Volume2, stage: Radio, forum: MessagesSquare, announcement: Megaphone };
export const LOCK_LABEL: Record<'role' | 'password' | 'payment', Key> = { role: msg('Locked: role required'), password: msg('Locked: password required'), payment: msg('Locked: paid channel') };

export function ChannelGlyph({ channel, size = 18 }: { channel: Channel; size?: number }) {
  if (channel.icon?.kind === 'icon') { const I = CHANNEL_ICONS[channel.icon.name]; if (I) return <I size={size} aria-hidden="true" />; }
  if (channel.icon?.kind === 'upload') return <img src={channel.icon.url} alt="" width={size} height={size} className="ch-img" />;
  const I = CHANNEL_ICON[channel.type];
  return <I size={size} strokeWidth={1.75} />;
}

function ServerSidebar({ serverId }: { serverId: string }) {
  const t = useT();
  const sv = useApp(s => s.servers[serverId]);
  const route = useApp(s => s.route);
  const collapsed = useApp(s => s.prefs.collapsed);
  const manage = useApp(s => canManage(s, serverId, 'manageChannels'));
  const portal = useApp(s => canManage(s, serverId, 'manageDeveloperPortal') || canManage(s, serverId));
  const muted = useApp(s => !!s.prefs.mutedServers[serverId]);
  const menu = useMenu();
  const btn = useRef<HTMLButtonElement>(null);
  if (!sv) return null;
  const activeId = route.name === 'channel' ? route.channelId : '';
  return (
    <>
      <div className="chead">
        <Art seed={sv.id + 'b'} color={sv.accent ?? sv.color} style={sv.bannerStyle} w={400} h={120} />
        <div className="chead-in">
          <CommunityIcon id={sv.id} name={sv.name} color={sv.color} style={sv.bannerStyle} size={44} />
          <div className="grow">
            <h2 className="ellip chead-name" dir="auto">{sv.name}</h2>
            <p className="chead-meta"><span className="tnum">{t('{n} members', { n: kfmt(sv.members) })}</span><span aria-hidden="true"> · </span><span className="tnum">{t('{n} online', { n: fmt(sv.online) })}</span></p>
          </div>
          <IconButton ref={btn} icon={MoreHorizontal} label={t('Community menu')} aria-haspopup="menu" aria-expanded={menu.isOpen} onClick={e => menu.open(e.currentTarget)} className="chead-menu" />
        </div>
        {sv.kind === 'room' && <span className="chead-flag">{t('Room · unlisted')}</span>}
      </div>
      {menu.isOpen && <Menu label={t('Community menu')} anchor={menu.anchor} onClose={menu.close} items={[
        { id: 'events', label: t('Events'), icon: <CalendarDays size={16} />, onSelect: () => go({ name: 'events', serverId }) },
        { id: 'invite', label: t('Invite people'), icon: <Link2 size={16} />, onSelect: () => go({ name: 'serverSettings', serverId, section: 'invites' }) },
        ...(portal ? [{ id: 'settings', label: t('Community settings'), icon: <Settings size={16} />, onSelect: () => go({ name: 'serverSettings', serverId, section: 'overview' }) }] : []),
        { id: 'read', label: t('Mark all as read'), icon: <Bell size={16} />, onSelect: () => markServerRead(serverId) },
        { id: 'mute', label: muted ? t('Unmute community') : t('Mute community'), icon: <BellOff size={16} />, onSelect: () => toggleServerMute(serverId) },
        ...(sv.kind === 'server' ? [{ id: 'donate', label: t('Support this community'), icon: <CircleDollarSign size={16} />, onSelect: () => openModal({ kind: 'donate', serverId }) }] : []),
        'sep',
        { id: 'report', label: t('Report community'), icon: <Flag size={16} />, onSelect: () => openModal({ kind: 'report', target: { kind: 'server', serverId } }) },
        ...(sv.owner !== 'me' ? [{ id: 'leave', label: t('Leave community'), icon: <LogOut size={16} />, danger: true, onSelect: () => leaveServer(serverId) }] : []),
      ]} />}
      <nav className="side-scroll scroll" aria-label={t('Channels')}>
        {sv.sponsor && <p className="sponsor-line meta">{t('Sponsored by {name}', { name: sv.sponsor.name })}</p>}
        <NavItem icon={<CalendarDays size={18} />} label={t('Events')} active={route.name === 'events'} onClick={() => go({ name: 'events', serverId })} />
        {sv.categories.map(cat => {
          const closed = collapsed[cat.id];
          return (
            <div key={cat.id} className="chgroup">
              <div className="side-sect">
                <button type="button" className="cat-toggle grow" aria-expanded={!closed} onClick={() => update(s => { s.prefs.collapsed[cat.id] = !closed; })}>
                  <ChevronDown size={14} aria-hidden="true" className={closed ? 'rot-90' : ''} /><span className="label ellip">{cat.name}</span>
                </button>
                {manage && <IconButton icon={Plus} size="sm" label={t('Create channel in {cat}', { cat: cat.name })} onClick={() => openModal({ kind: 'createChannel', serverId, categoryId: cat.id })} />}
              </div>
              {!closed && <ul>{cat.channelIds.map(id => <li key={id}><ChannelRow channelId={id} active={activeId === id} /></li>)}</ul>}
            </div>
          );
        })}
      </nav>
    </>
  );
}

function ChannelRow({ channelId, active }: { channelId: string; active: boolean }) {
  const t = useT();
  const c = useApp(s => s.channels[channelId]);
  const lock = useApp(s => (c ? channelLocked(s, c) : false));
  const unread = useApp(useShallow(s => unreadForChannel(s, channelId)));
  const muted = useApp(s => !!s.prefs.mutedChannels[channelId]);
  const occupants = useApp(useShallow(s => s.voiceOccupancy[channelId] ?? []));
  const inVoice = useApp(s => s.voice?.channelId === channelId);
  const audio = useApp(useShallow(s => ({ muted: s.audio.micMuted, camera: s.audio.camera })));
  if (!c) return null;
  const isVoice = c.type === 'voice' || c.type === 'stage';
  const people = inVoice ? [...occupants, 'me'] : occupants;
  const forumCount = c.type === 'forum' ? 0 : unread.count;
  const label = [
    c.name, t(({ text: msg('text channel'), voice: msg('voice channel'), stage: msg('stage channel'), forum: msg('forum'), announcement: msg('announcements') } as const)[c.type]),
    lock ? t(LOCK_LABEL[lock]) : '', forumCount && !muted ? (unread.mention ? t('mentions you') : t('{n} unread', { n: forumCount })) : '', muted ? t('muted') : '',
  ].filter(Boolean).join(', ');
  return (
    <>
      <button type="button" data-ctx="channel" data-id={channelId} className={`nav ch ${active ? 'is-active' : ''} ${forumCount && !muted ? 'is-unread' : ''} ${muted ? 'is-muted' : ''} ${lock ? 'is-locked' : ''}`} aria-current={active ? 'page' : undefined} aria-label={label}
        onClick={() => go({ name: 'channel', serverId: c.serverId, channelId: c.id })}>
        <span className="nav-icon" aria-hidden="true"><ChannelGlyph channel={c} /></span>
        <span className="nav-label ellip" dir="auto">{c.name}</span>
        {lock === 'payment' && c.lock?.kind === 'payment' && <span className="lock-chip" aria-hidden="true"><Lock size={12} />Rs {c.lock.pricePkr}</span>}
        {lock === 'role' && <span className="lock-chip" aria-hidden="true"><Lock size={12} />{t('Role')}</span>}
        {lock === 'password' && <span className="lock-chip" aria-hidden="true"><KeyRound size={12} /></span>}
        {isVoice && people.length > 0 && <span className="meta tnum" aria-hidden="true">{people.length}</span>}
        {unread.mention && !muted && forumCount ? <span className="count is-mention tnum" aria-hidden="true">@</span> : forumCount && !muted ? <span className="dot-unread" aria-hidden="true" /> : null}
      </button>
      {isVoice && people.length > 0 && (
        <ul className="voice-people" aria-label={t('In {name}', { name: c.name })}>
          {people.slice(0, 6).map(u => <VoicePerson key={u} userId={u} self={u === 'me'} muted={u === 'me' && audio.muted} camera={u === 'me' && audio.camera} />)}
          {people.length > 6 && <li className="meta">+{people.length - 6}</li>}
        </ul>
      )}
    </>
  );
}

function VoicePerson({ userId, self, muted, camera }: { userId: string; self: boolean; muted: boolean; camera: boolean }) {
  const t = useT();
  const name = useApp(s => s.users[userId]?.name ?? '');
  const speaking = !self && userId === 'ayesha';
  return (
    <li className={`vp ${speaking ? 'is-speaking' : ''}`}>
      <Avatar userId={userId} size={24} />
      <span className="ellip" dir="auto">{name}{self ? ` (${t('you')})` : ''}</span>
      {speaking && <span className="sr">{t('speaking')}</span>}
      {camera && <Video size={14} aria-label={t('Camera on')} />}
      {self && (muted ? <MicOff size={14} aria-label={t('Muted')} className="bad" /> : <Mic size={14} aria-hidden="true" className="mut" />)}
    </li>
  );
}
