import { cloneElement, memo, type ReactElement } from 'react';
import { rng } from '@/domain/rng';
import type { BannerStyle } from '@/types/models';

function mix(hex: string, target: string, amt: number): string {
  const p = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const a = p(hex.length === 7 ? hex : '#888888'), b = p(target);
  return '#' + a.map((v, i) => Math.round(v + (b[i]! - v) * amt).toString(16).padStart(2, '0')).join('');
}

/** Generated, restrained artwork for banners, community icons, stories and image placeholders. Decorative only. */
export const Art = memo(function Art({ seed, color, style = 'auto', w = 400, h = 160, className = '' }: { seed: string; color: string; style?: BannerStyle; w?: number; h?: number; className?: string }) {
  const r = rng(seed + style);
  const kinds: BannerStyle[] = ['study', 'gaming', 'jobs', 'fun', 'islamic', 'cities'];
  const k = style === 'auto' ? kinds[Math.floor(r() * kinds.length)]! : style;
  const bg = mix(color, '#08090C', 0.82), mid = mix(color, '#08090C', 0.5), hi = mix(color, '#FFFFFF', 0.12), lo = mix(color, '#08090C', 0.66);
  const R = (a: number, b: number) => a + r() * (b - a);
  const shapes: ReactElement[] = [];
  let key = 0;
  const add = (el: ReactElement) => shapes.push(cloneElement(el, { key: String(key++) }));
  if (k === 'study') {
    for (let i = 0; i < 9; i++) add(<line x1={R(-50, w)} y1={-10} x2={R(0, w + 50)} y2={h + 10} stroke={hi} strokeOpacity={0.12} strokeWidth={R(1, 3)} />);
    for (let i = 0; i < 4; i++) add(<circle cx={R(0, w)} cy={R(0, h)} r={R(20, 70)} fill="none" stroke={hi} strokeOpacity={0.22} strokeWidth={1.5} />);
    add(<circle cx={w * 0.78} cy={h * 0.35} r={h * 0.42} fill={mid} fillOpacity={0.5} />);
  } else if (k === 'gaming') {
    const s = 28;
    for (let x = 0; x < w; x += s) for (let y = 0; y < h; y += s) if (r() > 0.72) add(<rect x={x + 3} y={y + 3} width={s - 6} height={s - 6} rx={4} fill={r() > 0.5 ? mid : hi} fillOpacity={r() > 0.5 ? 0.55 : 0.18} />);
  } else if (k === 'jobs') {
    const n = 16, bw = w / n;
    for (let i = 0; i < n; i++) { const bh = R(h * 0.2, h * 0.85); add(<rect x={i * bw + 2} y={h - bh} width={Math.max(1, bw - 4)} height={bh} rx={2} fill={[mid, lo, hi][i % 3]} fillOpacity={R(0.25, 0.6)} />); }
  } else if (k === 'fun') {
    for (let i = 0; i < 7; i++) add(<circle cx={R(0, w)} cy={R(0, h)} r={R(12, 80)} fill={[mid, hi, lo][i % 3]} fillOpacity={R(0.2, 0.55)} />);
    add(<path d={`M0 ${h * 0.7} Q ${w * 0.3} ${h * 0.45} ${w * 0.55} ${h * 0.72} T ${w} ${h * 0.6} V ${h} H 0 Z`} fill={lo} fillOpacity={0.7} />);
  } else if (k === 'islamic') {
    const s = 64;
    for (let x = 0; x < w + s; x += s) for (let y = 0; y < h + s; y += s) add(
      <g transform={`translate(${x} ${y})`} fill="none" stroke={hi} strokeOpacity={0.24} strokeWidth={1.2}>
        <rect x={-18} y={-18} width={36} height={36} /><rect x={-18} y={-18} width={36} height={36} transform="rotate(45)" />
      </g>);
    add(<circle cx={w * 0.84} cy={h * 0.3} r={h * 0.18} fill={hi} fillOpacity={0.18} />);
  } else {
    for (let L = 0; L < 2; L++) { let x = -10; while (x < w) { const bw = R(24, 52), bh = R(h * (0.3 - L * 0.08), h * (0.65 - L * 0.12)); add(<rect x={x} y={h - bh} width={bw} height={bh} fill={L ? mid : lo} fillOpacity={L ? 0.55 : 0.85} />); x += bw + R(2, 8); } }
  }
  return (
    <svg className={`art ${className}`} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <rect width={w} height={h} fill={bg} />
      {shapes}
    </svg>
  );
});

/** Community icon: generated art with the community's first letter. */
export function CommunityIcon({ id, name, color, style, size = 44, className = '' }: { id: string; name: string; color: string; style?: BannerStyle; size?: number; className?: string }) {
  return (
    <span className={`cicon ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      <Art seed={id} color={color} style={style ?? 'auto'} w={120} h={120} />
      <b style={{ fontSize: Math.round(size * 0.42) }}>{[...name][0]}</b>
    </span>
  );
}
