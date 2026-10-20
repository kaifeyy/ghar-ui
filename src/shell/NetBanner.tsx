import { WifiOff, RefreshCw } from 'lucide-react';
import { useApp } from '@/state/store';
import { setNet } from '@/state/actions/net';
import { useT } from '@/i18n';
import { Button } from '@/ui/Button';

/** Network state only — never presence. Invisible users do not see this. */
export function NetBanner() {
  const t = useT();
  const net = useApp(s => s.net);
  const queued = useApp(s => {
    let n = 0;
    for (const l of Object.values(s.messages)) for (const m of l) if (m.delivery === 'queued') n++;
    for (const c of Object.values(s.conversations)) for (const m of c.messages) if (m.delivery === 'queued') n++;
    return n;
  });
  if (net === 'online') return null;
  return (
    <div className={`netbar is-${net}`} role="status">
      {net === 'offline' ? <WifiOff size={16} aria-hidden="true" /> : <span className="spinner" aria-hidden="true" />}
      <span>{net === 'offline' ? t('You’re offline. Messages you send will wait and go out when you reconnect.') : t('Reconnecting…')}</span>
      {queued > 0 && <span className="tag">{t('{n} waiting', { n: queued })}</span>}
      {net === 'offline' && <Button size="sm" variant="ghost" icon={RefreshCw} onClick={() => { setNet('reconnecting'); setTimeout(() => setNet('online'), 1200); }}>{t('Try again')}</Button>}
    </div>
  );
}
