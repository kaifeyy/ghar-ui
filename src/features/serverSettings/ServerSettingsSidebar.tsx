import { Settings, Shield, Hash, Users, Smile, Link2, CalendarDays, TrendingUp, BarChart3, GitMerge, Megaphone, LifeBuoy, Ticket, HandMetal, ShieldAlert, Gavel, Bomb, ScrollText, History, Bot, Plug, Code2, Trash2, ArrowLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useApp } from '@/state/store';
import { canManage } from '@/state/selectors';
import { go } from '@/state/actions/ui';
import { useT, msg, type Key } from '@/i18n';
import type { ServerSettingsSection } from '@/types/models';
import { NavItem } from '@/shell/Sidebar';

export interface SsDef { id: ServerSettingsSection; label: Key; icon: LucideIcon; group: 'community' | 'growth' | 'portal' | 'danger' }
export const SS_SECTIONS: SsDef[] = [
  { id: 'overview', label: msg('Overview'), icon: Settings, group: 'community' },
  { id: 'roles', label: msg('Roles'), icon: Shield, group: 'community' },
  { id: 'channels', label: msg('Channels'), icon: Hash, group: 'community' },
  { id: 'members', label: msg('Members'), icon: Users, group: 'community' },
  { id: 'emoji', label: msg('Emoji & stickers'), icon: Smile, group: 'community' },
  { id: 'invites', label: msg('Invites'), icon: Link2, group: 'community' },
  { id: 'events', label: msg('Events'), icon: CalendarDays, group: 'community' },
  { id: 'levels', label: msg('Levels & perks'), icon: TrendingUp, group: 'growth' },
  { id: 'analytics', label: msg('Engagement'), icon: BarChart3, group: 'growth' },
  { id: 'bridge', label: msg('Server bridge'), icon: GitMerge, group: 'growth' },
  { id: 'sponsor', label: msg('Sponsorship'), icon: Megaphone, group: 'growth' },
  { id: 'expert', label: msg('Expert help'), icon: LifeBuoy, group: 'growth' },
  { id: 'tickets', label: msg('Tickets'), icon: Ticket, group: 'portal' },
  { id: 'welcome', label: msg('Welcome'), icon: HandMetal, group: 'portal' },
  { id: 'automod', label: msg('Auto-moderation'), icon: ShieldAlert, group: 'portal' },
  { id: 'moderation', label: msg('Moderation cases'), icon: Gavel, group: 'portal' },
  { id: 'antinuke', label: msg('Anti-nuke'), icon: Bomb, group: 'portal' },
  { id: 'logs', label: msg('Server logs'), icon: ScrollText, group: 'portal' },
  { id: 'audit', label: msg('Audit log'), icon: History, group: 'portal' },
  { id: 'bots', label: msg('Bots'), icon: Bot, group: 'portal' },
  { id: 'integrations', label: msg('Social profiles & webhooks'), icon: Plug, group: 'portal' },
  { id: 'apps', label: msg('Developer apps'), icon: Code2, group: 'portal' },
  { id: 'delete', label: msg('Delete community'), icon: Trash2, group: 'danger' },
];
const GROUPS: Record<SsDef['group'], Key> = { community: msg('Community'), growth: msg('Growth'), portal: msg('Developer Portal'), danger: msg('Danger zone') };

export function ServerSettingsNav({ serverId }: { serverId: string }) {
  const t = useT();
  const r = useApp(s => s.route);
  const sv = useApp(s => s.servers[serverId]);
  const portal = useApp(s => canManage(s, serverId, 'manageDeveloperPortal'));
  const owner = sv?.owner === 'me';
  const active = r.name === 'serverSettings' ? r.section : null;
  const visible = SS_SECTIONS.filter(x => (x.group === 'portal' ? portal : true) && (x.group === 'danger' ? owner : true));
  return (
    <>
      <div className="side-top"><h2 className="side-title ellip">{sv?.name}</h2><p className="meta">{t('Community settings')}</p></div>
      <nav className="side-scroll scroll" aria-label={t('Community settings')}>
        {(['community', 'growth', 'portal', 'danger'] as const).map(g => {
          const items = visible.filter(x => x.group === g);
          if (!items.length) return null;
          return (
            <div key={g}>
              <div className="side-sect"><h3 className="label">{t(GROUPS[g])}</h3></div>
              <div className="navgroup">{items.map(x => <NavItem key={x.id} icon={<x.icon size={18} />} label={t(x.label)} active={active === x.id} onClick={() => go({ name: 'serverSettings', serverId, section: x.id }, { replace: true })} />)}</div>
            </div>
          );
        })}
        <div className="navgroup mt16"><NavItem icon={<ArrowLeft size={18} className="flip" />} label={t('Back to {name}', { name: sv?.name ?? '' })} onClick={() => go({ name: 'channel', serverId, channelId: sv?.categories[0]?.channelIds[0] ?? '' })} /></div>
      </nav>
    </>
  );
}
export function ServerSettingsSidebar({ serverId }: { serverId: string }) { return <ServerSettingsNav serverId={serverId} />; }
