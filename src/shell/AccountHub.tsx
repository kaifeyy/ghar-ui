import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, Search, Wallet, ShoppingBag, Zap, LogOut, ChevronRight, Pencil, User as UserIcon, X, Settings as Gear } from 'lucide-react';
import { useApp } from '@/state/store';
import { useMe, useMyStatus, useBalancePkr } from '@/state/selectors';
import { setPresence, setCustomStatus, clearCustomStatus } from '@/state/actions/presence';
import { go, setAccount } from '@/state/actions/ui';
import { confirmLogout } from '@/state/actions/auth';
import { useT, useLocale, type Key, msg } from '@/i18n';
import type { ManualPresence } from '@/types/models';
import type { StatusExpiry } from '@/domain/presence';
import { formatKarachi } from '@/domain/time';
import { fmt } from '@/domain/format';
import { Avatar, PresenceIcon, PRESENCE_LABEL } from '@/ui/Avatar';
import { Button, IconButton } from '@/ui/Button';
import { RadioList, Select, TextField } from '@/ui/Form';
import { usePopoverDismiss } from '@/ui/Overlay';
import { usePhone } from '@/hooks/useMedia';
import { SECTIONS, GROUP_LABEL, searchSettings, type SectionDef } from '@/features/settings/settingsIndex';

const PRESENCE_DESC: Record<ManualPresence, Key> = {
  online: msg('Available. AFK switches you to Idle after 10 minutes without activity.'),
  idle: msg('Shows you as away until you change it.'),
  dnd: msg('Mutes notification sounds and banners. Mentions still collect in your Inbox.'),
  invisible: msg('Appear offline. You can keep using Ghar; your connection is unaffected.'),
};
const SHORTCUTS: SectionDef['id'][] = ['profile', 'privacy', 'voice', 'appearance'];

/** up399 — compact account control at the physical upper-right, opening a non-modal account hub (a sheet on phones). */
export function AccountControl() {
  const t = useT();
  const me = useMe();
  const { p, custom } = useMyStatus();
  const open = useApp(s => s.accountOpen);
  const phone = usePhone();
  const trigger = useRef<HTMLButtonElement>(null);
  const label = t(p.shown === 'idle' && p.reason === 'afk' ? msg('Idle (AFK)') : PRESENCE_LABEL[p.shown]);
  return (
    <div className="acct" data-component="up399">
      <button ref={trigger} type="button" className={`acct-trigger ${open ? 'is-open' : ''}`} aria-haspopup="dialog" aria-expanded={open} aria-controls="account-hub"
        aria-label={t('Account: {name}, {status}', { name: me.name, status: label })} onClick={() => setAccount(!open)}>
        <Avatar userId="me" size={32} />
        <span className="acct-text">
          <b className="ellip">{me.name}</b>
          <span className="acct-status"><PresenceIcon kind={p.shown} size={10} ring={false} /><span className="ellip">{custom ? `${custom.emoji ?? ''} ${custom.text}`.trim() : label}</span></span>
        </span>
        <ChevronDown size={16} aria-hidden="true" className="acct-chev" />
      </button>
      {open && (phone ? <HubSheet trigger={trigger} /> : <HubPanel trigger={trigger} />)}
    </div>
  );
}

function HubPanel({ trigger }: { trigger: React.RefObject<HTMLButtonElement | null> }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const close = () => setAccount(false);
  usePopoverDismiss(true, close, ref, trigger);
  useEffect(() => { ref.current?.querySelector<HTMLElement>('[data-first]')?.focus(); return () => { if (document.activeElement === document.body || ref.current?.contains(document.activeElement)) trigger.current?.focus(); }; }, [trigger]);
  return <div ref={ref} id="account-hub" className="hub" role="dialog" aria-modal="false" aria-label={t('Account')}><HubContent onClose={close} /></div>;
}

function HubSheet({ trigger }: { trigger: React.RefObject<HTMLButtonElement | null> }) {
  const ref = useRef<HTMLDialogElement>(null);
  const t = useT();
  useLayoutEffect(() => {
    const d = ref.current!;
    if (!d.open) d.showModal();
    const cancel = (e: Event) => { e.preventDefault(); setAccount(false); };
    d.addEventListener('cancel', cancel);
    const tr = trigger.current;
    return () => { d.removeEventListener('cancel', cancel); if (d.open) d.close(); requestAnimationFrame(() => tr?.focus()); };
  }, [trigger]);
  return (
    <dialog ref={ref} id="account-hub" className="hub-sheet" aria-label={t('Account')}>
      <div className="hub-sheet-head"><b>{t('Account')}</b><IconButton icon={X} label={t('Close')} onClick={() => setAccount(false)} /></div>
      <div className="hub hub-in-sheet"><HubContent onClose={() => setAccount(false)} /></div>
    </dialog>
  );
}

function HubContent({ onClose }: { onClose: () => void }) {
  const t = useT();
  const locale = useLocale();
  const me = useMe();
  const manual = useApp(s => s.manualPresence);
  const { p, custom } = useMyStatus();
  const balance = useBalancePkr();
  const [q, setQ] = useState('');
  const [allOpen, setAllOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const results = searchSettings(q, t);
  const searchId = useId();
  const nav = (section: SectionDef['id']) => { onClose(); go({ name: 'settings', section }); };

  return (
    <div className="hub-in">
      <section className="hub-id" aria-label={t('Profile')}>
        <Avatar userId="me" size={48} />
        <div className="grow">
          <b className="hub-name ellip">{me.name}</b>
          <span className="meta ltr">@{me.handle}</span>
        </div>
      </section>
      <div className="row g8 hub-id-actions">
        <Button size="sm" icon={UserIcon} onClick={() => { onClose(); go({ name: 'profile', userId: 'me' }); }} data-first>{t('View profile')}</Button>
        <Button size="sm" icon={Pencil} onClick={() => nav('profile')}>{t('Edit profile')}</Button>
      </div>

      <section className="hub-sec" aria-labelledby="hub-presence">
        <h3 id="hub-presence" className="label">{t('Status')}</h3>
        <RadioList name="presence" legend={t('Status')} srLegend value={manual} onChange={v => setPresence(v)}
          options={(['online', 'idle', 'dnd', 'invisible'] as ManualPresence[]).map(v => ({
            value: v, icon: <PresenceIcon kind={v} size={12} ring={false} />, label: t(PRESENCE_LABEL[v]),
            description: v === manual || v === 'dnd' || v === 'invisible' ? t(PRESENCE_DESC[v]) : undefined,
          }))} />
        {manual === 'online' && p.reason === 'afk' && <p className="meta hub-afk">{t('You’re shown as Idle because you’ve been inactive. Move your mouse or type to return to Online.')}</p>}
        {editing ? <StatusEditor onDone={() => setEditing(false)} /> : (
          <div className="hub-custom">
            {custom ? (
              <>
                <span className="grow"><span className="ellip">{custom.emoji} {custom.text}</span>
                  <span className="meta block">{custom.expiresAt ? t('Clears {time}', { time: formatKarachi(custom.expiresAt, { hour: 'numeric', minute: '2-digit', weekday: 'short' }, locale) }) : t('Doesn’t clear')}</span></span>
                <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>{t('Edit')}</Button>
                <IconButton icon={X} size="sm" label={t('Clear status')} onClick={clearCustomStatus} />
              </>
            ) : <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(true)}>{t('Set a custom status')}</Button>}
          </div>
        )}
      </section>

      <section className="hub-sec" aria-labelledby="hub-settings">
        <h3 id="hub-settings" className="label">{t('Settings')}</h3>
        <div className="fbox hub-search">
          <Search size={16} aria-hidden="true" className="mut" />
          <label htmlFor={searchId} className="sr">{t('Search settings')}</label>
          <input id={searchId} type="search" placeholder={t('Search settings')} value={q} onChange={e => setQ(e.target.value)} aria-controls={`${searchId}-r`} />
        </div>
        <div id={`${searchId}-r`} aria-live="polite">
          {q.trim() && (results.length ? (
            <ul className="hub-list">{results.map(s => <li key={s.id}><HubLink def={s} onClick={() => nav(s.id)} /></li>)}</ul>
          ) : <p className="meta hub-none">{t('No settings match “{q}”.', { q })}</p>)}
        </div>
        {!q.trim() && (
          <>
            <ul className="hub-grid">{SHORTCUTS.map(id => SECTIONS.find(s => s.id === id)!).map(s => <li key={s.id}><HubLink def={s} onClick={() => nav(s.id)} compact /></li>)}</ul>
            <button type="button" className="hub-disclose" aria-expanded={allOpen} aria-controls="hub-all" onClick={() => setAllOpen(o => !o)}>
              <Gear size={16} aria-hidden="true" /><span className="grow">{t('All settings')}</span><ChevronDown size={16} aria-hidden="true" className={allOpen ? 'rot' : ''} />
            </button>
            {allOpen && (
              <div id="hub-all" className="hub-all">
                {(['account', 'app', 'money', 'community'] as const).map(g => (
                  <div key={g}>
                    <h4 className="label hub-group">{t(GROUP_LABEL[g])}</h4>
                    <ul className="hub-list">{SECTIONS.filter(s => s.group === g).map(s => <li key={s.id}><HubLink def={s} onClick={() => nav(s.id)} /></li>)}</ul>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <section className="hub-sec hub-money" aria-label={t('Wallet and shop')}>
        <button type="button" className="hub-row" onClick={() => nav('wallet')}><Wallet size={18} aria-hidden="true" /><span className="grow">{t('Wallet')}</span><b className="tnum">Rs {fmt(balance)}</b></button>
        <button type="button" className="hub-row" onClick={() => nav('shop')}><ShoppingBag size={18} aria-hidden="true" /><span className="grow">{t('Shop')}</span><ChevronRight size={16} aria-hidden="true" className="flip mut" /></button>
        <button type="button" className="hub-row" onClick={() => { onClose(); useApp.setState(s => { s.recapOpen = true; }); }}><Zap size={18} aria-hidden="true" /><span className="grow">{t('Your year on Ghar')}</span><ChevronRight size={16} aria-hidden="true" className="flip mut" /></button>
      </section>

      <div className="hub-foot">
        <Button variant="danger-ghost" size="sm" icon={LogOut} onClick={() => { onClose(); confirmLogout(); }}>{t('Log out')}</Button>
      </div>
    </div>
  );
}

function HubLink({ def, onClick, compact }: { def: SectionDef; onClick: () => void; compact?: boolean }) {
  const t = useT();
  const I = def.icon;
  return <button type="button" className={compact ? 'hub-tile' : 'hub-row'} onClick={onClick}><I size={18} aria-hidden="true" /><span className="grow ellip">{t(def.label)}</span>{!compact && <ChevronRight size={16} aria-hidden="true" className="flip mut" />}</button>;
}

function StatusEditor({ onDone }: { onDone: () => void }) {
  const t = useT();
  const cur = useApp(s => s.customStatus);
  const [text, setText] = useState(cur?.text ?? '');
  const [emoji, setEmoji] = useState(cur?.emoji ?? '');
  const [exp, setExp] = useState<StatusExpiry>('today');
  return (
    <form className="hub-editor" onSubmit={e => { e.preventDefault(); setCustomStatus(text, emoji || undefined, exp); onDone(); }}>
      <div className="row g8">
        <TextField label={t('Emoji')} value={emoji} onChange={e => setEmoji([...e.target.value].slice(-2).join(''))} className="hub-emoji" maxLength={4} />
        <TextField label={t('Custom status')} value={text} onChange={e => setText(e.target.value)} maxLength={80} className="grow" autoFocus placeholder={t('What’s happening?')} />
      </div>
      <Select label={t('Clear after')} value={exp} onValue={setExp} options={[['30m', t('30 minutes')], ['1h', t('1 hour')], ['4h', t('4 hours')], ['today', t('Today')], ['never', t('Don’t clear')]]} />
      <div className="row g8 end">
        <Button size="sm" variant="ghost" onClick={onDone}>{t('Cancel')}</Button>
        <Button size="sm" variant="primary" type="submit">{t('Save')}</Button>
      </div>
    </form>
  );
}
