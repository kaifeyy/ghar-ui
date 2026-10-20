import { forwardRef, type ButtonHTMLAttributes, type ComponentType, type ReactNode } from 'react';
import type { LucideProps } from 'lucide-react';

export type IconType = ComponentType<LucideProps>;
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-ghost' | 'green';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'md' | 'sm';
  icon?: IconType;
  iconEnd?: IconType;
  loading?: boolean;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon: Icon, iconEnd: IconEnd, loading, block, className = '', children, type = 'button', disabled, ...rest }, ref,
) {
  return (
    <button ref={ref} type={type} className={`btn btn-${variant} btn-${size} ${block ? 'btn-block' : ''} ${className}`} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <span className="spinner" aria-hidden="true" /> : Icon ? <Icon size={size === 'sm' ? 16 : 18} strokeWidth={1.75} aria-hidden="true" /> : null}
      {children != null && <span>{children}</span>}
      {IconEnd && <IconEnd size={16} strokeWidth={1.75} aria-hidden="true" className="flip" />}
    </button>
  );
});

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: IconType;
  label: string;
  size?: 'md' | 'sm';
  pressed?: boolean;
  tone?: 'default' | 'active' | 'danger' | 'muted';
  badge?: ReactNode;
  iconSize?: number;
  /** show the label as a tooltip (default true) */
  tip?: boolean;
  /** action-oriented tooltip text when it should differ from the stable accessible name */
  tipText?: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, label, size = 'md', pressed, tone = 'default', badge, iconSize, tip = true, tipText, className = '', type = 'button', ...rest }, ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`ibtn ibtn-${size} tone-${tone} ${pressed ? 'is-pressed' : ''} ${className}`}
      aria-label={label}
      aria-pressed={pressed}
      data-tip={tip ? (tipText ?? label) : undefined}
      {...rest}
    >
      <Icon size={iconSize ?? (size === 'sm' ? 18 : 20)} strokeWidth={1.75} aria-hidden="true" />
      {badge}
    </button>
  );
});

export function Spinner({ label }: { label?: string }) {
  return <span className="spinner" role={label ? 'status' : undefined} aria-label={label} aria-hidden={label ? undefined : true} />;
}
