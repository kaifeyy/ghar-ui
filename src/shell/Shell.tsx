import { useRef, type KeyboardEvent, type PointerEvent as RPointerEvent, type ReactNode } from 'react';
import { Inbox, Users, LayoutGrid, Compass, MessageSquare, ChevronLeft } from 'lucide-react';
import { useApp, update } from '@/state/store';
import { go, setDrawer, back } from '@/state/actions/ui';
import { useT } from '@/i18n';
import { usePhone, useMedia } from '@/hooks/useMedia';
import { IconButton } from '@/ui/Button';
import { AppBar } from './AppBar';
import { Sidebar } from './Sidebar';
import { MainView, RightView, useRightKind } from '@/features/routes';
import { NetBanner } from './NetBanner';

const LIMITS = { side: [240, 360, 288], right: [240, 360, 272] } as const;

function Resizer({ which }: { which: 'side' | 'right' }) {
  const t = useT();
  const width = useApp(s => s.prefs.widths[which]);
  const [min, max, def] = LIMITS[which];
  const set = (w: number) => update(s => { s.prefs.widths[which] = Math.round(Math.min(max, Math.max(min, w))); });
  const drag = useRef<{ x: number; w: number } | null>(null);
  const sign = () => (which === 'side' ? 1 : -1) * (document.documentElement.dir === 'rtl' ? -1 : 1);
  const onDown = (e: RPointerEvent<HTMLDivElement>) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, w: width }; document.body.classList.add('resizing'); };
  const onMove = (e: RPointerEvent) => { if (drag.current) set(drag.current.w + sign() * (e.clientX - drag.current.x)); };
  const onUp = () => { drag.current = null; document.body.classList.remove('resizing'); };
  const onKey = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 32 : 12;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); set(width + (e.key === 'ArrowRight' ? 1 : -1) * sign() * step); }
    if (e.key === 'Home') set(min); if (e.key === 'End') set(max);
  };
  return (
    <div className={`resizer rz-${which}`} role="separator" aria-orientation="vertical" tabIndex={0} aria-valuemin={min} aria-valuemax={max} aria-valuenow={width}
      aria-label={which === 'side' ? t('Resize navigation panel') : t('Resize side panel')} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onKeyDown={onKey} onDoubleClick={() => set(def)} />
  );
}

/** Screen header used by every main view (kept ~56px, title + context + actions). */
export function ScreenHeader({ icon, title, subtitle, actions, tags, backTo }: { icon?: ReactNode; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; tags?: ReactNode; backTo?: boolean }) {
  const t = useT();
  const phone = usePhone();
  return (
    <header className="hdr">
      {phone && backTo ? <IconButton icon={ChevronLeft} label={t('Back')} className="flip" onClick={back} /> : icon ? <span className="hdr-icon" aria-hidden="true">{icon}</span> : null}
      <div className="hdr-title">
        <h1 className="ellip" dir="auto">{title}</h1>
        {subtitle && <p className="hdr-sub ellip" dir="auto">{subtitle}</p>}
      </div>
      {tags && <div className="hdr-tags">{tags}</div>}
      {actions && <div className="hdr-actions">{actions}</div>}
    </header>
  );
}

function MobileTabs() {
  const t = useT();
  const route = useApp(s => s.route);
  const unread = useApp(s => s.inbox.filter(i => i.unread).length);
  const tabs = [
    { id: 'home', label: t('Home'), icon: Inbox, active: route.name === 'inbox', go: () => go({ name: 'inbox' }), badge: unread },
    { id: 'chats', label: t('Messages'), icon: MessageSquare, active: ['dm', 'friends', 'calls'].includes(route.name), go: () => go({ name: 'friends', tab: 'online' }) },
    { id: 'communities', label: t('Communities'), icon: LayoutGrid, active: ['communities', 'channel', 'events', 'serverSettings'].includes(route.name), go: () => go({ name: 'communities' }) },
    { id: 'discover', label: t('Discover'), icon: Compass, active: route.name === 'discover', go: () => go({ name: 'discover', cat: 'all' }) },
    { id: 'people', label: t('Popularity'), icon: Users, active: ['popularity', 'leaderboards', 'profile'].includes(route.name), go: () => go({ name: 'popularity' }) },
  ];
  return (
    <nav className="tabbar" aria-label={t('Main')}>
      {tabs.map(x => (
        <button key={x.id} type="button" className={x.active ? 'on' : ''} aria-current={x.active ? 'page' : undefined} onClick={x.go}>
          <x.icon size={22} strokeWidth={1.75} aria-hidden="true" />
          <span className="tab-label">{x.label}</span>
          {x.badge ? <span className="tab-count tnum" aria-label={t('{n} unread', { n: x.badge })}>{x.badge}</span> : null}
        </button>
      ))}
    </nav>
  );
}

export function Shell() {
  const route = useApp(s => s.route);
  const drawer = useApp(s => s.drawerOpen);
  const rightKind = useRightKind();
  const phone = usePhone();
  const wide = useMedia('(min-width: 1240px)');
  const t = useT();
  const hasSidebar = route.name !== 'staff';
  const hasRight = !!rightKind;
  return (
    <div className="app">
      <a className="skip" href="#main">{t('Skip to content')}</a>
      <AppBar />
      <NetBanner />
      <div className={`shell ${drawer ? 'drawer-open' : ''}`}>
        {hasSidebar && (
          <>
            <div className="side-wrap" {...(phone && !drawer ? { inert: true } : {})}>
              <Sidebar />
            </div>
            {phone && drawer && <div className="scrim-drawer" onClick={() => setDrawer(false)} aria-hidden="true" />}
            {!phone && <Resizer which="side" />}
          </>
        )}
        <main id="main" className={`main main-${route.name}`} tabIndex={-1}>
          <MainView />
        </main>
        {hasRight && (
          <>
            {wide && <Resizer which="right" />}
            {!wide && rightKind !== 'thread' && <div className="scrim-panel" onClick={() => update(s => { s.rightPanel = null; })} aria-hidden="true" />}
            <RightView kind={rightKind} />
          </>
        )}
      </div>
      {phone && <MobileTabs />}
    </div>
  );
}
