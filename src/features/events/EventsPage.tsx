import { useShallow } from 'zustand/react/shallow';
import { CalendarDays, Plus, Users, Radio, Code, Tv, Mic } from 'lucide-react';
import { useApp } from '@/state/store';
import { canManage } from '@/state/selectors';
import { openModal } from '@/state/actions/ui';
import { rsvp } from '@/state/actions/community';
import { useT, useLocale, msg, type Key } from '@/i18n';
import { formatKarachi } from '@/domain/time';
import { ScreenHeader } from '@/shell/Shell';
import { Button } from '@/ui/Button';
import { Empty, Tag } from '@/ui/Misc';
import { Avatar } from '@/ui/Avatar';

const TYPE: Record<string, [Key, typeof Mic]> = { 'open-mic': [msg('Open mic'), Mic], hackathon: [msg('Hackathon'), Code], 'watch-along': [msg('Match watch-along'), Tv], ama: [msg('AMA'), Radio], meetup: [msg('Meetup'), Users] };

export function EventsPage({ serverId }: { serverId: string }) {
  const t = useT();
  const locale = useLocale();
  const sv = useApp(s => s.servers[serverId]);
  const events = useApp(useShallow(s => s.events.filter(e => e.serverId === serverId).sort((a, b) => a.startsAt - b.startsAt)));
  const rsvps = useApp(s => s.rsvps);
  const manage = useApp(s => canManage(s, serverId));
  return (
    <>
      <ScreenHeader icon={<CalendarDays size={20} />} title={t('Events')} subtitle={sv?.name} backTo actions={manage ? <Button size="sm" variant="primary" icon={Plus} onClick={() => openModal({ kind: 'createEvent', serverId })}>{t('Create event')}</Button> : undefined} />
      <div className="scroll"><div className="page">
        {events.length ? <ul className="events">{events.map(e => {
          const [label, I] = TYPE[e.type] ?? TYPE.meetup!;
          const mine = rsvps[e.id];
          const live = e.startsAt <= Date.now();
          return (
            <li key={e.id} className="event-card">
              <div className="event-date" aria-hidden="true"><b>{formatKarachi(e.startsAt, { day: 'numeric' }, locale)}</b><span>{formatKarachi(e.startsAt, { month: 'short' }, locale)}</span></div>
              <div className="grow col g4">
                <div className="row g8 wrap"><Tag icon={I}>{t(label)}</Tag>{live && <Tag tone="red">{t('Happening now')}</Tag>}{mine && <Tag tone="green">{mine === 'going' ? t('Going') : t('Interested')}</Tag>}</div>
                <button type="button" className="event-title" onClick={() => openModal({ kind: 'event', eventId: e.id })}><h3>{e.name}</h3></button>
                <p className="meta">{formatKarachi(e.startsAt, { weekday: 'long', hour: 'numeric', minute: '2-digit' }, locale)} PKT · {t('{a} going · {b} interested', { a: e.going, b: e.interested })}</p>
                <p className="small muted clamp2">{e.description}</p>
                <div className="row g8 wrap mt8">
                  <Avatar userId={e.host} size={20} /><span className="meta grow">{useApp.getState().users[e.host]?.name}</span>
                  <Button size="sm" variant={mine === 'going' ? 'primary' : 'secondary'} aria-pressed={mine === 'going'} onClick={() => rsvp(e.id, mine === 'going' ? null : 'going')}>{t('Going')}</Button>
                  <Button size="sm" aria-pressed={mine === 'interested'} onClick={() => rsvp(e.id, mine === 'interested' ? null : 'interested')}>{t('Interested')}</Button>
                </div>
              </div>
            </li>
          );
        })}</ul> : <Empty icon={CalendarDays} title={t('No events yet')}>{manage ? t('Create one so members can RSVP and get reminders.') : t('Check back later.')}</Empty>}
      </div></div>
    </>
  );
}
