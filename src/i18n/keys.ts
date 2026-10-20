import type en from './en';
export type Key = keyof typeof en;
/** Marks a string literal as a catalogue key without translating it (safe to import anywhere, no runtime deps). */
export const msg = <K extends Key>(k: K): K => k;
