import { LayoutGrid, Gamepad2, BookOpen, Briefcase, MapPin, Moon, Smile, Bot } from 'lucide-react';
import { useApp } from '@/state/store';
import { go } from '@/state/actions/ui';
import { useT, msg, type Key } from '@/i18n';
import { NavItem } from '@/shell/Sidebar';

export const DISCOVER_CATS: [string, Key, typeof LayoutGrid][] = [
  ['all', msg('All communities'), LayoutGrid], ['Gaming', msg('Gaming'), Gamepad2], ['Study', msg('Study'), BookOpen], ['Jobs', msg('Jobs'), Briefcase],
  ['Local cities', msg('Local cities'), MapPin], ['Islamic', msg('Islamic'), Moon], ['Fun', msg('Fun'), Smile],
];
export function DiscoverSidebar() {
  const t = useT();
  const r = useApp(s => s.route);
  const cat = r.name === 'discover' ? r.cat : 'all';
  return (
    <>
      <div className="side-top"><h2 className="side-title">{t('Discover')}</h2></div>
      <nav className="side-scroll scroll" aria-label={t('Categories')}>
        <div className="navgroup">{DISCOVER_CATS.map(([id, label, I]) => <NavItem key={id} icon={<I size={20} />} label={t(label)} active={cat === id} onClick={() => go({ name: 'discover', cat: id }, { replace: true })} />)}</div>
        <div className="side-sect"><h3 className="label">{t('Developers')}</h3></div>
        <NavItem icon={<Bot size={20} />} label={t('Bot directory')} active={cat === 'bots'} onClick={() => go({ name: 'discover', cat: 'bots' }, { replace: true })} />
      </nav>
    </>
  );
}
