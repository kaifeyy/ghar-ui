// Time helpers. The demo uses Asia/Karachi (UTC+5, no daylight saving) for all ranking periods.
export const KARACHI_OFFSET_MIN = 5 * 60;
export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

/** YYYY-MM-DD for the Karachi calendar day containing `ms`. */
export function karachiDay(ms: number): string {
  const d = new Date(ms + KARACHI_OFFSET_MIN * MIN);
  return d.toISOString().slice(0, 10);
}

/** Epoch ms of 00:00 Karachi time on the day containing `ms`. */
export function startOfKarachiDay(ms: number): number {
  const shifted = ms + KARACHI_OFFSET_MIN * MIN;
  return shifted - (((shifted % DAY) + DAY) % DAY) - KARACHI_OFFSET_MIN * MIN;
}

/** Epoch ms of Monday 00:00 Karachi time for the week containing `ms`. */
export function startOfKarachiWeek(ms: number): number {
  const dayStart = startOfKarachiDay(ms);
  const dow = new Date(dayStart + KARACHI_OFFSET_MIN * MIN).getUTCDay(); // 0 = Sunday
  const sinceMonday = (dow + 6) % 7;
  return dayStart - sinceMonday * DAY;
}

export function dayFromKey(key: string): number {
  return Date.parse(key + 'T00:00:00Z') - KARACHI_OFFSET_MIN * MIN;
}

export function formatKarachi(ms: number, opts: Intl.DateTimeFormatOptions, locale = 'en-GB'): string {
  return new Intl.DateTimeFormat(locale, { timeZone: 'Asia/Karachi', ...opts }).format(ms);
}

export function relTime(ms: number, now: number): string {
  const d = now - ms;
  if (d < MIN) return 'just now';
  if (d < HOUR) return `${Math.floor(d / MIN)} min ago`;
  if (d < DAY) return `${Math.floor(d / HOUR)} h ago`;
  if (d < 2 * DAY) return 'yesterday';
  return `${Math.floor(d / DAY)} days ago`;
}
