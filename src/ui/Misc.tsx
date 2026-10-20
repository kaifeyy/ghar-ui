import type { ReactNode } from 'react';
import { Info, AlertTriangle, AlertCircle, CheckCircle2, FlaskConical } from 'lucide-react';
import type { IconType } from './Button';

export function Tag({ children, tone = 'neutral', icon: Icon, className = '' }: { children: ReactNode; tone?: 'neutral' | 'green' | 'amber' | 'red' | 'info' | 'outline'; icon?: IconType; className?: string }) {
  return <span className={`tag tag-${tone} ${className}`}>{Icon && <Icon size={13} strokeWidth={2} aria-hidden="true" />}{children}</span>;
}

/** Labelled simulation marker: placed next to the thing it qualifies, not as a global banner. */
export function DemoTag({ children }: { children: ReactNode }) {
  return <Tag tone="outline" icon={FlaskConical} className="demo-tag">{children}</Tag>;
}

export function Note({ tone = 'info', title, children, action, className = '' }: { tone?: 'info' | 'warn' | 'danger' | 'ok'; title?: ReactNode; children?: ReactNode; action?: ReactNode; className?: string }) {
  const I = { info: Info, warn: AlertTriangle, danger: AlertCircle, ok: CheckCircle2 }[tone];
  return (
    <div className={`note note-${tone} ${className}`} role={tone === 'danger' ? 'alert' : undefined}>
      <I size={18} aria-hidden="true" />
      <div className="grow">{title && <b className="note-title">{title}</b>}{children && <div className="note-body">{children}</div>}</div>
      {action}
    </div>
  );
}

export function Empty({ icon: Icon, title, children, action }: { icon: IconType; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-ic"><Icon size={24} strokeWidth={1.5} aria-hidden="true" /></span>
      <b>{title}</b>
      {children && <p className="muted">{children}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="skel" aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="skel-row"><span className="skel-av" /><span className="col grow g8"><span className="skel-line" style={{ width: `${30 + ((i * 17) % 30)}%` }} /><span className="skel-line" style={{ width: `${60 + ((i * 23) % 35)}%` }} /></span></div>
      ))}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: 'ok' | 'bad' }) {
  return <div className="stat"><span className="stat-label">{label}</span><b className="stat-value tnum">{value}</b>{sub && <span className={`stat-sub ${tone ?? ''}`}>{sub}</span>}</div>;
}

export function Section({ title, description, actions, children, id }: { title?: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section className="sec" aria-labelledby={id}>
      {(title || actions) && (
        <div className="sec-head">
          <div className="grow">{title && <h3 id={id} className="sec-title">{title}</h3>}{description && <p className="sec-desc">{description}</p>}</div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div className="grow"><h1 className="page-title">{title}</h1>{description && <p className="page-desc">{description}</p>}</div>
      {actions && <div className="row g8 wrap">{actions}</div>}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) { return <kbd>{children}</kbd>; }
