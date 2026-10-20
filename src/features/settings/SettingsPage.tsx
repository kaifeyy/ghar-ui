import { SocialLinksManager } from '@/features/social/SocialLinks';
import type { ReactNode } from 'react';
import { Settings as Gear } from 'lucide-react';
import { useApp } from '@/state/store';
import { useT } from '@/i18n';
import type { SettingsSection } from '@/types/models';
import { usePhone } from '@/hooks/useMedia';
import { ScreenHeader } from '@/shell/Shell';
import { SECTIONS } from './settingsIndex';
import { SettingsNav } from './SettingsSidebar';
import { AccountSection, ProfileSection, PrivacySection, DevicesSection } from './AccountSections';
import { AppearanceSection, LanguageSection, VoiceSection, NotificationsSection, PrayerSection } from './AppSections';
import { WalletSection, PayoutsSection, PlusSection, ShopSection, TitlesSection } from './MoneySections';
import { ModeratorSection } from './ModeratorSection';

export function SettingsBody({ children }: { children: ReactNode }) { return <div className="scroll"><div className="page settings-page">{children}</div></div>; }

export function SettingsPage({ section }: { section: SettingsSection | null }) {
  const t = useT();
  const phone = usePhone();
  const last = useApp(s => s.prefs.lastSettings);
  const s = section ?? (phone ? null : last);
  if (!s) return <><ScreenHeader icon={<Gear size={20} />} title={t('Settings')} backTo /><div className="settings-list"><SettingsNav /></div></>;
  const def = SECTIONS.find(x => x.id === s)!;
  const body = (() => {
    switch (s) {
      case 'account': return <AccountSection />;
      case 'profile': return <ProfileSection />;
      case 'privacy': return <PrivacySection />;
      case 'devices': return <DevicesSection />;
      case 'appearance': return <AppearanceSection />;
      case 'language': return <LanguageSection />;
      case 'voice': return <VoiceSection />;
      case 'notifications': return <NotificationsSection />;
      case 'prayer': return <PrayerSection />;
      case 'wallet': return <WalletSection />;
      case 'payouts': return <PayoutsSection />;
      case 'plus': return <PlusSection />;
      case 'shop': return <ShopSection />;
      case 'titles': return <TitlesSection />;
      case 'moderator': return <ModeratorSection />;
      case 'connections': return <SettingsBody><SocialLinksManager owner="me" subject="you" /></SettingsBody>;
    }
  })();
  return <><ScreenHeader icon={<def.icon size={20} />} title={t(def.label)} backTo />{body}</>;
}
