import { ContextMenuHost } from '@/shell/ContextMenu';
import { useEffect } from 'react';
import { useApp } from '@/state/store';
import { tick, touchInput } from '@/state/actions/presence';
import { openModal, setDev, back, go } from '@/state/actions/ui';
import { setNet } from '@/state/actions/net';
import { LANGS } from '@/i18n';
import { Shell } from '@/shell/Shell';
import { ConfirmHost, ToastHost, TooltipHost } from '@/ui/Overlay';
import { ModalHost } from '@/features/modals/ModalHost';
import { AuthScreen } from '@/features/auth/AuthScreen';
import { Onboarding } from '@/features/auth/Onboarding';
import { StaffConsole } from '@/features/staff/StaffConsole';
import { StoryViewer } from '@/features/stories/StoryViewer';
import { Recap } from '@/features/profile/Recap';
import { DevTools } from '@/features/dev/DevTools';
import { useHashRoute } from '@/hooks/useHashRoute';

function useDocumentPrefs() {
  const prefs = useApp(s => s.prefs);
  useEffect(() => {
    const r = document.documentElement;
    const lang = LANGS.find(l => l.id === prefs.lang)!;
    r.lang = prefs.lang;
    r.dir = lang.dir;
    const sysLight = matchMedia('(prefers-color-scheme: light)').matches;
    r.dataset.theme = prefs.theme === 'system' ? (sysLight ? 'light' : 'dark') : prefs.theme;
    r.dataset.skin = prefs.skin;
    if (prefs.largeText) r.dataset.text = 'large'; else delete r.dataset.text;
    if (prefs.reduceMotion === true) r.dataset.motion = 'reduce'; else if (prefs.reduceMotion === false) r.dataset.motion = 'full'; else delete r.dataset.motion;
    if (prefs.accent) r.style.setProperty('--green', prefs.accent); else r.style.removeProperty('--green');
    r.style.setProperty('--side-w', prefs.widths.side + 'px');
    r.style.setProperty('--right-w', prefs.widths.right + 'px');
  }, [prefs]);
  useEffect(() => {
    const m = matchMedia('(prefers-color-scheme: light)');
    const f = () => { if (useApp.getState().prefs.theme === 'system') document.documentElement.dataset.theme = m.matches ? 'light' : 'dark'; };
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
}

function useGlobalEvents() {
  useEffect(() => {
    const id = setInterval(tick, 15_000);
    const input = () => touchInput();
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && useApp.getState().authed) { e.preventDefault(); openModal({ kind: 'quick' }); }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') { e.preventDefault(); setDev(!useApp.getState().devOpen); }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f' && useApp.getState().authed) { e.preventDefault(); go({ name: 'search' }); }
      if (e.altKey && e.key === 'ArrowLeft') back();
    };
    const online = () => setNet('online');
    const offline = () => setNet('offline');
    window.addEventListener('pointerdown', input, { passive: true });
    window.addEventListener('keydown', input, { passive: true });
    window.addEventListener('keydown', key);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => { clearInterval(id); window.removeEventListener('pointerdown', input); window.removeEventListener('keydown', input); window.removeEventListener('keydown', key); window.removeEventListener('online', online); window.removeEventListener('offline', offline); };
  }, []);
}

export function App() {
  useDocumentPrefs();
  useGlobalEvents();
  useHashRoute();
  const authed = useApp(s => s.authed);
  const step = useApp(s => s.authStep);
  const route = useApp(s => s.route);
  const devOpen = useApp(s => s.devOpen);
  let screen;
  if (!authed) screen = <AuthScreen />;
  else if (step === 'onboarding') screen = <Onboarding />;
  else if (route.name === 'staff') screen = <StaffConsole />;
  else screen = <Shell />;
  return (
    <>
      {screen}
      <ModalHost />
      <StoryViewer />
      <Recap />
      <ConfirmHost />
      <ToastHost />
      <TooltipHost />
      <ContextMenuHost />
      {devOpen && <DevTools />}
    </>
  );
}
