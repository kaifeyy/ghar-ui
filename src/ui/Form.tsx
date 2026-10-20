import { useId, useRef, type InputHTMLAttributes, type KeyboardEvent, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { IconType } from './Button';

interface FieldShell { label?: ReactNode; hint?: ReactNode; error?: string | null; ok?: string | null; required?: boolean; className?: string; prefix?: ReactNode; icon?: IconType; trailing?: ReactNode; srLabel?: boolean }

function Shell({ id, label, hint, error, ok, required, className = '', prefix, icon: Icon, trailing, srLabel, children }: FieldShell & { id: string; children: ReactNode }) {
  return (
    <div className={`field ${className}`}>
      {label && <label className={`flabel ${srLabel ? 'sr' : ''}`} htmlFor={id}>{label}{required && <span className="mut"> *</span>}</label>}
      <div className={`fbox ${error ? 'is-err' : ''}`}>
        {Icon && <Icon size={16} strokeWidth={1.75} aria-hidden="true" className="mut" />}
        {prefix && <span className="fprefix">{prefix}</span>}
        {children}
        {trailing}
      </div>
      {error ? <span className="ferr" id={`${id}-e`} role="alert"><AlertCircle size={14} aria-hidden="true" />{error}</span>
        : ok ? <span className="fok" id={`${id}-h`}><CheckCircle2 size={14} aria-hidden="true" />{ok}</span>
        : hint ? <span className="fhint" id={`${id}-h`}>{hint}</span> : null}
    </div>
  );
}
const describedBy = (id: string, f: FieldShell) => (f.error ? `${id}-e` : f.ok || f.hint ? `${id}-h` : undefined);

export function TextField(props: FieldShell & Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'>) {
  const auto = useId();
  const { label, hint, error, ok, required, className, prefix, icon, trailing, srLabel, id = auto, ...rest } = props;
  return (
    <Shell {...{ id, label, hint, error, ok, required, className, prefix, icon, trailing, srLabel }}>
      <input id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, props)} required={required} dir="auto" {...rest} />
    </Shell>
  );
}

export function TextArea(props: FieldShell & TextareaHTMLAttributes<HTMLTextAreaElement> & { count?: number }) {
  const auto = useId();
  const { label, hint, error, ok, required, className, id = auto, count, maxLength, value, ...rest } = props;
  return (
    <Shell {...{ id, label, hint: count != null && maxLength ? <>{hint} <span className="tnum">{String(value ?? '').length} / {maxLength}</span></> : hint, error, ok, required, className: `${className ?? ''} is-area` }}>
      <textarea id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, props)} maxLength={maxLength} value={value} dir="auto" rows={3} {...rest} />
    </Shell>
  );
}

export { Select } from './Pickers';

/** Switch with a visible label and optional description. */
export function Toggle({ label, description, checked, onChange, disabled, note }: { label: ReactNode; description?: ReactNode; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; note?: ReactNode }) {
  const id = useId();
  return (
    <div className={`trow ${disabled ? 'is-disabled' : ''}`}>
      <div className="grow">
        <label htmlFor={id} className="trow-label">{label}</label>
        {description && <p className="trow-desc" id={`${id}-d`}>{description}</p>}
        {note && <p className="trow-note">{note}</p>}
      </div>
      <button id={id} type="button" role="switch" aria-checked={checked} aria-describedby={description ? `${id}-d` : undefined} disabled={disabled} className={`switch ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}>
        <span className="knob" aria-hidden="true" />
      </button>
    </div>
  );
}

export function Checkbox({ label, checked, onChange, disabled, description }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; description?: ReactNode }) {
  return (
    <label className={`check ${disabled ? 'is-disabled' : ''}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} />
      <span className="grow"><span>{label}</span>{description && <span className="meta block">{description}</span>}</span>
    </label>
  );
}

export interface RadioOption<V extends string> { value: V; label: ReactNode; description?: ReactNode; icon?: ReactNode; disabled?: boolean; disabledReason?: ReactNode }
/** Native radios → arrow keys, single tab stop, correct semantics for free. */
export function RadioList<V extends string>({ name, legend, value, onChange, options, variant = 'list', srLegend }: { name: string; legend: ReactNode; value: V; onChange: (v: V) => void; options: RadioOption<V>[]; variant?: 'list' | 'segmented' | 'cards'; srLegend?: boolean }) {
  return (
    <fieldset className={`radios radios-${variant}`}>
      <legend className={srLegend ? 'sr' : 'flabel'}>{legend}</legend>
      <div className="radios-in">
        {options.map(o => (
          <label key={o.value} className={`radio ${value === o.value ? 'is-on' : ''} ${o.disabled ? 'is-disabled' : ''}`}>
            <input type="radio" name={name} value={o.value} checked={value === o.value} disabled={o.disabled} onChange={() => onChange(o.value)} />
            {o.icon && <span className="radio-icon" aria-hidden="true">{o.icon}</span>}
            <span className="grow radio-text">
              <span className="radio-label">{o.label}</span>
              {o.description && <span className="radio-desc">{o.description}</span>}
              {o.disabled && o.disabledReason && <span className="radio-desc warn">{o.disabledReason}</span>}
            </span>
            {variant === 'list' && <span className="radio-check" aria-hidden="true">{value === o.value ? <CheckCircle2 size={18} /> : null}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export interface TabDef<V extends string> { value: V; label: ReactNode; count?: number }
/** Tabs with roving focus (arrow keys, Home/End), RTL aware. */
export function Tabs<V extends string>({ tabs, value, onChange, label, idBase, className = '' }: { tabs: TabDef<V>[]; value: V; onChange: (v: V) => void; label: string; idBase: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const onKey = (e: KeyboardEvent) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const rtl = document.documentElement.dir === 'rtl';
    const i = tabs.findIndex(t => t.value === value);
    let n = i;
    if (e.key === 'Home') n = 0; else if (e.key === 'End') n = tabs.length - 1;
    else n = (i + ((e.key === 'ArrowRight') !== rtl ? 1 : -1) + tabs.length) % tabs.length;
    const next = tabs[n]!;
    onChange(next.value);
    requestAnimationFrame(() => ref.current?.querySelector<HTMLButtonElement>(`#${idBase}-${next.value}`)?.focus());
  };
  return (
    <div ref={ref} className={`tabs ${className}`} role="tablist" aria-label={label} onKeyDown={onKey}>
      {tabs.map(t => (
        <button key={t.value} id={`${idBase}-${t.value}`} type="button" role="tab" aria-selected={t.value === value} aria-controls={`${idBase}-panel`} tabIndex={t.value === value ? 0 : -1} className={t.value === value ? 'on' : ''} onClick={() => onChange(t.value)}>
          <span>{t.label}</span>{t.count ? <span className="count">{t.count}</span> : null}
        </button>
      ))}
    </div>
  );
}
export function TabPanel({ idBase, value, children, className = '' }: { idBase: string; value: string; children: ReactNode; className?: string }) {
  return <div id={`${idBase}-panel`} role="tabpanel" aria-labelledby={`${idBase}-${value}`} className={className}>{children}</div>;
}
