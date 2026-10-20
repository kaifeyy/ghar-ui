export const fmt = (n: number, locale = 'en-PK') => new Intl.NumberFormat(locale).format(n);
export const kfmt = (n: number) => (n >= 10000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : fmt(n));
export const pkr = (paisa: number) => 'Rs ' + fmt(Math.round(Math.abs(paisa) / 100));
export const toPaisa = (rupees: number) => Math.round(rupees * 100);
export const initials = (name: string) =>
  name.replace(/^Dr\.\s*/, '').split(/\s+/).filter(Boolean).map(w => [...w][0] ?? '').slice(0, 2).join('').toUpperCase();
export function duration(sec: number): string {
  const m = Math.floor(sec / 60), s = sec % 60;
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : m > 0 ? `${m} min` : `${s} s`;
}
export const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
