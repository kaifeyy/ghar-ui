import { useState } from 'react';
import { Search, ArrowLeft } from 'lucide-react';
import { useApp } from '@/state/store';
import { go } from '@/state/actions/ui';
import { useT } from '@/i18n';
import { NavItem } from '@/shell/Sidebar';
import { SECTIONS, GROUP_LABEL, searchSettings } from './settingsIndex';

export function SettingsNav({ onPick }: { onPick?: () => void }) {
  const t = useT();
  const r = useApp(s => s.route);
  const active = r.name === 'settings' ? r.section : null;
  const [q, setQ] = useState('');
  const results = searchSettings(q, t);
  const nav = (id: (typeof SECTIONS)[number]['id']) => { go({ name: 'settings', section: id }, { replace: r.name === 'settings' }); onPick?.(); };
  return (
    <>
      <div className="side-top">
        <h2 className="side-title">{t('Settings')}</h2>
        <div className="fbox side-find"><Search size={16} aria-hidden="true" className="mut" /><label className="sr" htmlFor="set-q">{t('Search settings')}</label><input id="set-q" type="search" placeholder={t('Search settings')} value={q} onChange={e => setQ(e.target.value)} /></div>
      </div>
      <nav className="side-scroll scroll" aria-label={t('Settings sections')}>
        {q.trim() ? (
          <div className="navgroup" aria-live="polite">{results.length ? results.map(s => <NavItem key={s.id} icon={<s.icon size={20} />} label={t(s.label)} active={active === s.id} onClick={() => nav(s.id)} />) : <p className="meta pad12">{t('No settings match “{q}”.', { q })}</p>}</div>
        ) : (['account', 'app', 'money', 'community'] as const).map(g => (
          <div key={g}>
            <div className="side-sect"><h3 className="label">{t(GROUP_LABEL[g])}</h3></div>
            <div className="navgroup">{SECTIONS.filter(s => s.group === g).map(s => <NavItem key={s.id} icon={<s.icon size={20} />} label={t(s.label)} active={active === s.id} onClick={() => nav(s.id)} />)}</div>
          </div>
        ))}
        <div className="navgroup mt16"><NavItem icon={<ArrowLeft size={20} className="flip" />} label={t('Back to Ghar')} onClick={() => go({ name: 'inbox' })} /></div>
      </nav>
    </>
  );
}
export function SettingsSidebar() { return <SettingsNav />; }
