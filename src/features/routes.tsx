import { ChatSearchPage } from '@/features/search/ChatSearchPage';
import { useApp } from '@/state/store';
import { useMedia } from '@/hooks/useMedia';
import { Inbox } from './home/Inbox';
import { Friends, Calls, Logs, Communities, Relationships } from './home/HomeScreens';
import { DmView } from './home/DmView';
import { ChannelView } from './chat/ChannelView';
import { ThreadPanel, MembersPanel, SearchPanel, PinsPanel } from './chat/Panels';
import { EventsPage } from './events/EventsPage';
import { Discover } from './discover/Discover';
import { Profile } from './profile/Profile';
import { PopularityPage } from './popularity/PopularityPage';
import { Leaderboards } from './popularity/Leaderboards';
import { SettingsPage } from './settings/SettingsPage';
import { ServerSettingsPage } from './serverSettings/ServerSettingsPage';

export function MainView() {
  const r = useApp(s => s.route);
  switch (r.name) {
    case 'inbox': return <Inbox />;
    case 'search': return <ChatSearchPage />;
    case 'friends': return <Friends tab={r.tab} />;
    case 'dm': return <DmView convId={r.convId} />;
    case 'calls': return <Calls />;
    case 'logs': return <Logs />;
    case 'communities': return <Communities />;
    case 'relationships': return <Relationships />;
    case 'popularity': return <PopularityPage />;
    case 'leaderboards': return <Leaderboards />;
    case 'channel': return <ChannelView key={r.channelId} serverId={r.serverId} channelId={r.channelId} />;
    case 'events': return <EventsPage serverId={r.serverId} />;
    case 'discover': return <Discover cat={r.cat} />;
    case 'profile': return <Profile userId={r.userId} />;
    case 'settings': return <SettingsPage section={r.section} />;
    case 'serverSettings': return <ServerSettingsPage serverId={r.serverId} section={r.section} />;
    case 'staff': return null;
  }
}

export type RightKind = 'thread' | 'members' | 'search' | 'pins' | null;
export function useRightKind(): RightKind {
  const r = useApp(s => s.route);
  const panel = useApp(s => s.rightPanel);
  const ctype = useApp(s => (r.name === 'channel' ? s.channels[r.channelId]?.type : undefined));
  const wide = useMedia('(min-width: 1240px)');
  if (panel === 'thread') return 'thread';
  if (r.name === 'channel') {
    if (panel === 'search' || panel === 'pins' || panel === 'members') return panel;
    if (wide && ctype && ctype !== 'voice' && ctype !== 'stage') return 'members';
  }
  if (r.name === 'dm' && panel === 'search') return 'search';
  return null;
}
export function RightView({ kind }: { kind: RightKind }) {
  const r = useApp(s => s.route);
  if (kind === 'thread') return <ThreadPanel />;
  if (r.name === 'channel') {
    if (kind === 'search') return <SearchPanel channelId={r.channelId} />;
    if (kind === 'pins') return <PinsPanel channelId={r.channelId} />;
    if (kind === 'members') return <MembersPanel serverId={r.serverId} />;
  }
  if (r.name === 'dm' && kind === 'search') return <SearchPanel convId={r.convId} />;
  return null;
}
