import { useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { LayoutGrid, Compass, Plus, Menu as MenuIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '@/state/store';
import { serverChannels, unreadForChannel } from '@/state/selectors';
import { go, openModal, setDrawer } from '@/state/actions/ui';
import { useT } from '@/i18n';
import { CommunityIcon } from '@/ui/Art';
import { IconButton } from '@/ui/Button';
import { GharMark } from '@/ui/Brand';
import { AudioControls } from './AudioControls';
import { AccountControl } from './AccountHub';

function useServerUnread() {
  return useApp(useShallow(s => {
    const out: Record<string, string> = {};
    for (const id of s.joined) {
      let count = 0, mention = 0;
      for (const c of serverChannels(s, id)) { const u = unreadForChannel(s, c.id); count += u.count; if (u.mention) mention += 1; }
      out[id] = `${count}|${mention}|${s.prefs.mutedServers[id] ? 1 : 0}`;
    }
    return out;
  }));
}

/** up400 — horizontal application bar: global navigation, joined communities, audio/settings, and the account control (up399) at the physical far right. */
export function AppBar() {
  const t = useT();
  const route = useApp(s => s.route);
  const joined = useApp(s => s.joined);
  const servers = useApp(s => s.servers);
  const inboxUnread = useApp(s => s.inbox.filter(i => i.unread).length);
  const unread = useServerUnread();
  const strip = useRef<HTMLDivElement>(null);
  const activeServer = route.name === 'channel' || route.name === 'events' || route.name === 'serverSettings' ? route.serverId : null;
  const homeActive = ['inbox', 'friends', 'dm', 'calls', 'logs', 'popularity', 'leaderboards', 'relationships', 'profile'].includes(route.name);

  const firstChannel = (id: string) => {
    const s = useApp.getState();
    const c = serverChannels(s, id).find(ch => ch.type === 'text' && !ch.lock) ?? serverChannels(s, id)[0];
    return c?.id ?? '';
  };
  const scrollStrip = (dir: 1 | -1) => strip.current?.scrollBy({ left: dir * 240, behavior: 'smooth' });

  const tiles = useMemo(() => joined.map(id => servers[id]).filter(Boolean), [joined, servers]);

  return (
    <header className="appbar" data-component="up400" aria-label={t('Main navigation')}>
      <div className="bar-start">
        <IconButton icon={MenuIcon} label={t('Open navigation')} className="bar-menu" onClick={() => setDrawer(true)} />
        <button type="button" className={`bar-home ${homeActive ? 'is-active' : ''}`} aria-current={homeActive ? 'page' : undefined} aria-label={inboxUnread ? t('Home, {n} unread', { n: inboxUnread }) : t('Home')} data-tip={t('Home')} onClick={() => go({ name: 'inbox' })}>
          <GharMark size={22} />
          {inboxUnread > 0 && <span className="bar-count tnum" aria-hidden="true">{inboxUnread}</span>}
        </button>
        <button type="button" className="bar-picker" onClick={() => openModal({ kind: 'allCommunities' })} aria-haspopup="dialog">
          <LayoutGrid size={18} strokeWidth={1.75} aria-hidden="true" />
          <span className="bar-picker-label">{t('All communities')}</span>
        </button>
      </div>

      <nav className="bar-mid" aria-label={t('Your communities')}>
        <IconButton icon={ChevronLeft} label={t('Scroll communities back')} size="sm" className="strip-nudge flip" onClick={() => scrollStrip(document.documentElement.dir === 'rtl' ? 1 : -1)} />
        <div className="strip" ref={strip}>
          <ul className="strip-list">
            {tiles.map(sv => {
              const [count, mention, muted] = (unread[sv!.id] ?? '0|0|0').split('|').map(Number) as [number, number, number];
              const active = activeServer === sv!.id;
              const label = [sv!.name, mention ? t('{n} mentions', { n: mention }) : count && !muted ? t('unread') : '', muted ? t('muted') : ''].filter(Boolean).join(', ');
              return (
                <li key={sv!.id}>
                  <button type="button" className={`tile ${active ? 'is-active' : ''} ${count && !muted ? 'is-unread' : ''} ${muted ? 'is-muted' : ''}`} aria-current={active ? 'page' : undefined} aria-label={label} data-tip={sv!.name}
                    onClick={() => go({ name: 'channel', serverId: sv!.id, channelId: firstChannel(sv!.id) })}>
                    <CommunityIcon id={sv!.id} name={sv!.name} color={sv!.color} style={sv!.bannerStyle} size={32} />
                    {mention > 0 ? <span className="tile-badge tnum" aria-hidden="true">{mention}</span> : count > 0 && !muted ? <span className="tile-dot" aria-hidden="true" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <IconButton icon={ChevronRight} label={t('Scroll communities forward')} size="sm" className="strip-nudge flip" onClick={() => scrollStrip(document.documentElement.dir === 'rtl' ? -1 : 1)} />
        <div className="bar-mid-actions">
          <IconButton icon={Compass} label={t('Discover communities')} pressed={route.name === 'discover'} onClick={() => go({ name: 'discover', cat: 'all' })} />
          <IconButton icon={Plus} label={t('Create a community')} onClick={() => openModal({ kind: 'createCommunity' })} />
        </div>
      </nav>

      <div className="bar-end">
        <AudioControls />
        <AccountControl />
      </div>
    </header>
  );
}
