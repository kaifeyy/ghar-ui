import type { SettingsSection } from '@/types/models';
import type { Key } from '@/i18n';
import { msg } from '@/i18n';
import { matchScore } from '@/domain/search';
import type { LucideIcon } from 'lucide-react';
import { Link2, User, Palette, ShieldCheck, Laptop, Sun, Languages, Mic, Bell, Moon, Wallet, Banknote, Zap, ShoppingBag, Crown, BadgeCheck } from 'lucide-react';

export interface SectionDef { id: SettingsSection; label: Key; group: 'account' | 'app' | 'money' | 'community'; icon: LucideIcon; keywords: string }
export const SECTIONS: SectionDef[] = [
  { id: 'account', label: msg('My account'), group: 'account', icon: User, keywords: 'email username password phone verify date of birth delete account export data sign out logout handle رکنیت حساب खाता' },
  { id: 'profile', label: msg('Profile'), group: 'account', icon: Palette, keywords: 'display name bio avatar banner picture photo song title flag relationship entrance effect colour پروفائل ملف प्रोफ़ाइल' },
  { id: 'privacy', label: msg('Privacy & safety'), group: 'account', icon: ShieldCheck, keywords: 'blocked users block dms messages last seen hide ip story audience connections safety report رازداری خصوصية गोपनीयता' },
  { id: 'devices', label: msg('Devices'), group: 'account', icon: Laptop, keywords: 'sessions sign out devices phone laptop logged in آلات أجهزة डिवाइस' },
  { id: 'connections', label: msg('Connected accounts'), group: 'account', icon: Link2, keywords: 'social instagram x twitter youtube tiktok twitch linkedin spotify website link profile connect accounts روابط حسابات सोशल' },
  { id: 'appearance', label: msg('Appearance'), group: 'app', icon: Sun, keywords: 'theme dark light mode accent colour skin chat style bubbles accessibility reduced motion large text font size contrast app icon ظاہری مظهر दिखावट' },
  { id: 'language', label: msg('Language'), group: 'app', icon: Languages, keywords: 'english urdu arabic hindi rtl right to left اردو العربية हिन्दी زبان لغة भाषा' },
  { id: 'voice', label: msg('Voice & video'), group: 'app', icon: Mic, keywords: 'microphone mic input output speakers headset camera webcam push to talk noise suppression echo test audio video hide ip آواز صوت आवाज़' },
  { id: 'notifications', label: msg('Notifications'), group: 'app', icon: Bell, keywords: 'alerts push sound mentions dms replies events mute do not disturb dnd اطلاعات إشعارات सूचनाएँ' },
  { id: 'prayer', label: msg('Prayer times'), group: 'app', icon: Moon, keywords: 'namaz salah azaan adhan fajr dhuhr asr maghrib isha city method hanafi نماز صلاة नमाज़' },
  { id: 'wallet', label: msg('Wallet'), group: 'money', icon: Wallet, keywords: 'balance add money top up jazzcash easypaisa nayapay stripe transactions refund payment بٹوا محفظة वॉलेट' },
  { id: 'payouts', label: msg('Payouts'), group: 'money', icon: Banknote, keywords: 'earnings withdraw cnic kyc hold creator tips donations ادائیگی' },
  { id: 'plus', label: msg('Ghar Plus'), group: 'money', icon: Zap, keywords: 'subscription premium perks monthly' },
  { id: 'shop', label: msg('Shop'), group: 'money', icon: ShoppingBag, keywords: 'cosmetics nameplate decoration banner effect bubble theme icon buy دکان متجر दुकान' },
  { id: 'titles', label: msg('Titles'), group: 'money', icon: Crown, keywords: 'title active earned bought name effect' },
  { id: 'moderator', label: msg('Moderator qualification'), group: 'community', icon: BadgeCheck, keywords: 'certified moderator assessment exam badge qualification' },
];
export const GROUP_LABEL: Record<SectionDef['group'], Key> = { account: msg('Account'), app: msg('App'), money: msg('Money'), community: msg('Community') };

/** Concept-level search: matches labels in the current language plus English/multilingual keywords. */
export function searchSettings(q: string, label: (k: Key) => string): SectionDef[] {
  if (!q.trim()) return [];
  return SECTIONS.map(s => ({ s, score: matchScore(q, [label(s.label), s.keywords]) })).filter(x => x.score > 0).sort((a, b) => b.score - a.score).map(x => x.s);
}
