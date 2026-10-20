import { useCallback } from 'react';
import type { Lang } from '@/types/models';
import { useApp } from '@/state/store';
import en from './en';
import ur from './ur';
import ar from './ar';
import hi from './hi';

import type { Key } from './keys';
export type { Key } from './keys';
export { msg } from './keys';
export const CATALOGS: Record<Lang, Record<Key, string>> = { en, ur, ar, hi };

export const LANGS: { id: Lang; native: string; english: string; dir: 'ltr' | 'rtl'; locale: string }[] = [
  { id: 'en', native: 'English', english: 'English', dir: 'ltr', locale: 'en-PK' },
  { id: 'ur', native: 'اردو', english: 'Urdu', dir: 'rtl', locale: 'ur-PK' },
  { id: 'ar', native: 'العربية', english: 'Arabic', dir: 'rtl', locale: 'ar-u-nu-latn' },
  { id: 'hi', native: 'हिन्दी', english: 'Hindi', dir: 'ltr', locale: 'hi-IN' },
];

export type Vars = Record<string, string | number>;
export function translate(lang: Lang, key: Key, vars?: Vars): string {
  let s: string = CATALOGS[lang][key] ?? en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

export type T = (key: Key, vars?: Vars) => string;
export function useT(): T {
  const lang = useApp(s => s.prefs.lang);
  return useCallback((key: Key, vars?: Vars) => translate(lang, key, vars), [lang]);
}
export function useLocale(): string {
  const lang = useApp(s => s.prefs.lang);
  return LANGS.find(l => l.id === lang)?.locale ?? 'en-PK';
}
/** Plural helper: picks `one` when n === 1. */
export const plural = (t: T, n: number, one: Key, other: Key) => t(n === 1 ? one : other, { n });
