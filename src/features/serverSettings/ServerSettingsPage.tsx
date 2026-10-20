import { Settings as Gear, Lock } from 'lucide-react';
import { useApp } from '@/state/store';
import { canManage } from '@/state/selectors';
import { useT } from '@/i18n';
import type { ServerSettingsSection } from '@/types/models';
import { usePhone } from '@/hooks/useMedia';
import { ScreenHeader } from '@/shell/Shell';
import { Empty } from '@/ui/Misc';
import { SS_SECTIONS, ServerSettingsNav } from './ServerSettingsSidebar';
import { OverviewSection, RolesSection, ChannelsSection, MembersSection, EmojiSection, InvitesSection, EventsAdminSection, LevelsSection, AnalyticsSection, BridgeSection, SponsorSection, ExpertSection, DeleteSection } from './CommunitySections';
import { TicketsSection, WelcomeSection, AutomodSection, ModerationSection, AntiNukeSection, LogsSection, AuditSection, BotsSection, IntegrationsSection, AppsSection, PortalLocked } from './PortalSections';

export function ServerSettingsPage({ serverId, section }: { serverId: string; section: ServerSettingsSection | null }) {
  const t = useT();
  const phone = usePhone();
  const sv = useApp(s => s.servers[serverId]);
  const manage = useApp(s => canManage(s, serverId));
  const portal = useApp(s => canManage(s, serverId, 'manageDeveloperPortal'));
  if (!sv) return <Empty icon={Gear} title={t('Community not found')} />;
  if (!manage && !portal) return <><ScreenHeader icon={<Lock size={20} />} title={t('Community settings')} backTo /><Empty icon={Lock} title={t('No access')}>{t('Only the owner and admins can change these settings. Client-side checks like this one aren’t real security; the server would enforce them.')}</Empty></>;
  const s = section ?? (phone ? null : 'overview');
  if (!s) return <><ScreenHeader icon={<Gear size={20} />} title={sv.name} backTo /><div className="settings-list"><ServerSettingsNav serverId={serverId} /></div></>;
  const def = SS_SECTIONS.find(x => x.id === s)!;
  const body = (() => {
    if (def.group === 'portal' && !portal) return <PortalLocked />;
    switch (s) {
      case 'overview': return <OverviewSection serverId={serverId} />;
      case 'roles': return <RolesSection serverId={serverId} />;
      case 'channels': return <ChannelsSection serverId={serverId} />;
      case 'members': return <MembersSection serverId={serverId} />;
      case 'emoji': return <EmojiSection serverId={serverId} />;
      case 'invites': return <InvitesSection />;
      case 'events': return <EventsAdminSection serverId={serverId} />;
      case 'levels': return <LevelsSection serverId={serverId} />;
      case 'analytics': return <AnalyticsSection serverId={serverId} />;
      case 'bridge': return <BridgeSection serverId={serverId} />;
      case 'sponsor': return <SponsorSection serverId={serverId} />;
      case 'expert': return <ExpertSection serverId={serverId} />;
      case 'delete': return <DeleteSection serverId={serverId} />;
      case 'tickets': return <TicketsSection serverId={serverId} />;
      case 'welcome': return <WelcomeSection serverId={serverId} />;
      case 'automod': return <AutomodSection serverId={serverId} />;
      case 'moderation': return <ModerationSection serverId={serverId} />;
      case 'antinuke': return <AntiNukeSection serverId={serverId} />;
      case 'logs': return <LogsSection serverId={serverId} />;
      case 'audit': return <AuditSection serverId={serverId} />;
      case 'bots': return <BotsSection />;
      case 'integrations': return <IntegrationsSection serverId={serverId} />;
      case 'apps': return <AppsSection />;
    }
  })();
  return <><ScreenHeader icon={<def.icon size={20} />} title={t(def.label)} subtitle={sv.name} backTo /><div className="scroll"><div className="page page-wide">{body}</div></div></>;
}
