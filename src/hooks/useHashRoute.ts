import { useEffect } from 'react';
import { useApp, update } from '@/state/store';
import type { Route } from '@/state/types';

/** Keeps location.hash in sync with the route so Back/Forward and reloads behave. */
function encode(r: Route): string {
  switch (r.name) {
    case 'channel': return `#/c/${r.serverId}/${r.channelId}`;
    case 'events': return `#/c/${r.serverId}/events`;
    case 'dm': return `#/dm/${r.convId}`;
    case 'friends': return `#/friends/${r.tab}`;
    case 'discover': return `#/discover/${encodeURIComponent(r.cat)}`;
    case 'profile': return `#/u/${r.userId}`;
    case 'settings': return `#/settings/${r.section ?? ''}`;
    case 'serverSettings': return `#/c/${r.serverId}/settings/${r.section ?? ''}`;
    case 'staff': return `#/staff/${r.section}`;
    default: return `#/${r.name}`;
  }
}
function decode(h: string): Route | null {
  const p = h.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  const [a, b, c, d] = p;
  if (a === 'c' && b && c === 'events') return { name: 'events', serverId: b };
  if (a === 'c' && b && c === 'settings') return { name: 'serverSettings', serverId: b, section: (d || null) as never };
  if (a === 'c' && b && c) return { name: 'channel', serverId: b, channelId: c };
  if (a === 'dm' && b) return { name: 'dm', convId: b };
  if (a === 'friends') return { name: 'friends', tab: (b as never) || 'online' };
  if (a === 'discover') return { name: 'discover', cat: b || 'all' };
  if (a === 'u' && b) return { name: 'profile', userId: b };
  if (a === 'settings') return { name: 'settings', section: (b || null) as never };
  if (a === 'staff') return { name: 'staff', section: (b as never) || 'dashboard' };
  if (a && ['inbox', 'search', 'calls', 'logs', 'communities', 'popularity', 'leaderboards', 'relationships'].includes(a)) return { name: a } as Route;
  return null;
}
export function useHashRoute() {
  const route = useApp(s => s.route);
  const authed = useApp(s => s.authed);
  useEffect(() => {
    const r = decode(location.hash);
    if (location.hash.includes('demo')) update(s => { s.authed = true; });
    if (location.hash.includes('dev')) update(s => { s.devOpen = true; });
    if (r) update(s => { s.route = r; });
    const on = () => { const n = decode(location.hash); if (n && JSON.stringify(n) !== JSON.stringify(useApp.getState().route)) update(s => { s.route = n; s.drawerOpen = false; s.accountOpen = false; }); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  useEffect(() => {
    if (!authed) return;
    const h = encode(route);
    if (location.hash !== h) history.pushState(null, '', h);
  }, [route, authed]);
}
