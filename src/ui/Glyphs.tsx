import type { Gift } from '@/types/models';

/** Flat, single-weight gift artwork on a 48px grid. Decorative (labels are provided by the parent). */
export function GiftArt({ art, size = 48 }: { art: Gift['art']; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 48 48', 'aria-hidden': true, focusable: false } as const;
  switch (art) {
    case 'chai': return (
      <svg {...common}><rect x="9" y="18" width="24" height="20" rx="5" fill="#C98B4E" /><path d="M33 22h3a5 5 0 0 1 0 10h-3" fill="none" stroke="#C98B4E" strokeWidth="3" /><rect x="12" y="21" width="18" height="5" rx="2" fill="#E8C18F" /><path d="M17 8c-2 3 2 4 0 7M23 8c-2 3 2 4 0 7" stroke="#949BA8" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
    );
    case 'heart': return <svg {...common}><path d="M24 40S8 30.5 8 19a8 8 0 0 1 16-2 8 8 0 0 1 16 2c0 11.5-16 21-16 21z" fill="#F07878" /><path d="M15 16a4 4 0 0 1 4-3" stroke="#FFD4D4" strokeWidth="2.5" fill="none" strokeLinecap="round" /></svg>;
    case 'rose': return <svg {...common}><path d="M24 26v16" stroke="#3CCB91" strokeWidth="3" strokeLinecap="round" /><path d="M24 34c-5 0-8-3-8-6 4 0 7 2 8 6z" fill="#3CCB91" /><circle cx="24" cy="17" r="10" fill="#E25C7A" /><path d="M24 11c-4 2-4 8 0 10 4-2 4-8 0-10z" fill="#B83A5A" /></svg>;
    case 'star': return <svg {...common}><path d="m24 6 5.3 11.2 12.2 1.6-9 8.5 2.3 12.1L24 33.5 13.2 39.4l2.3-12.1-9-8.5 12.2-1.6z" fill="#E5B454" /><path d="m24 13 2.6 5.6" stroke="#FFF1CF" strokeWidth="2.5" strokeLinecap="round" /></svg>;
    case 'rocket': return <svg {...common}><path d="M24 6c7 5 9 13 7 22H17c-2-9 0-17 7-22z" fill="#9CC3F5" /><circle cx="24" cy="18" r="4" fill="#18191C" /><path d="M17 28l-5 6 6-1M31 28l5 6-6-1" fill="#5AA9F5" /><path d="M20 30h8l-4 10z" fill="#E5B454" /></svg>;
    case 'crown': return <svg {...common}><path d="M8 34 6 14l10 8 8-12 8 12 10-8-2 20z" fill="#E5B454" /><rect x="8" y="34" width="32" height="5" rx="2" fill="#C99A3A" /><circle cx="24" cy="26" r="3" fill="#F07878" /></svg>;
  }
}

/** Distinct top-three medals: different silhouettes, not just colours. */
export function Medal({ rank, size = 28 }: { rank: 1 | 2 | 3; size?: number }) {
  const fill = rank === 1 ? '#E5B454' : rank === 2 ? '#B5BAC5' : '#C98B4E';
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false" className="medal">
      <path d="M10 2h5l3 8h-5zM22 2h-5l-3 8h5z" fill="#5E6470" />
      {rank === 1 && <circle cx="16" cy="20" r="10" fill={fill} />}
      {rank === 2 && <path d="M16 9.5 25.5 15v10L16 30.5 6.5 25V15z" fill={fill} />}
      {rank === 3 && <rect x="7" y="11" width="18" height="18" rx="4" fill={fill} />}
      <text x="16" y="24.5" textAnchor="middle" fontSize="11" fontWeight="700" fill="#111215" fontFamily="IBM Plex Sans, sans-serif">{rank}</text>
    </svg>
  );
}
