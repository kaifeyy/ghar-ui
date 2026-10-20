import { createPortal } from 'react-dom';
import { useLayoutEffect, useRef, useState } from 'react';
import type { Badge } from '@/types/models';
import { useApp } from '@/state/store';

function BadgeItem({ badge, size }: { badge: Badge; size: 'regular' | 'compact' }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const open = hovered || focused;
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const trigger = useRef<HTMLLIElement>(null);
  const card = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const triggerRect = trigger.current?.getBoundingClientRect();
      const cardRect = card.current?.getBoundingClientRect();
      if (!triggerRect || !cardRect) return;
      const left = Math.max(8, Math.min(innerWidth - cardRect.width - 8, triggerRect.left + triggerRect.width / 2 - cardRect.width / 2));
      const top = triggerRect.top > cardRect.height + 16 ? triggerRect.top - cardRect.height - 10 : Math.min(innerHeight - cardRect.height - 8, triggerRect.bottom + 10);
      setPosition({ left, top });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  return (
    <li ref={trigger} className={`badge ${badge.animated ? 'is-animated' : ''}`} tabIndex={0} aria-label={`${badge.name}: ${badge.description}`} aria-describedby={open ? `badge-${badge.id}` : undefined}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>
      <span className="badge-icon">{badge.image ? <img src={badge.image} alt="" /> : <span aria-hidden="true">✦</span>}</span>
      <span className="badge-name">{badge.name}</span>
      {open && createPortal(
        <span ref={card} id={`badge-${badge.id}`} className={`badge-card badge-card-${size}`} role="tooltip" style={position}>
          <span className="badge-card-icon">{badge.image ? <img src={badge.image} alt="" /> : <span aria-hidden="true">✦</span>}</span>
          <span className="badge-card-copy"><b>{badge.name}</b><span>{badge.description}</span></span>
        </span>, document.body,
      )}
    </li>
  );
}

export function Badges({ ids, staffView = false, size = 'regular' }: { ids: string[]; staffView?: boolean; size?: 'regular' | 'compact' }) {
  const catalog = useApp(s => s.badgeCatalog);
  const list = ids.map(id => catalog.find(b => b.id === id)).filter((b): b is Badge => !!b && (!b.staffOnly || staffView));
  if (!list.length) return null;
  return <ul className={`badges badges-${size}`} aria-label="Profile badges">{list.map(b => <BadgeItem key={b.id} badge={b} size={size} />)}</ul>;
}
