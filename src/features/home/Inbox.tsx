import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Inbox as InboxIcon, CheckCheck, X, Lock, CalendarDays, Gift, Heart, Plus, Check } from 'lucide-react';
import { useApp } from '@/state/store';
import { go, openModal } from '@/state/actions/ui';
import { markInboxRead, markAllInboxRead, dismissInbox, acceptRequest, declineRequest, respondRelationship } from '@/state/actions/social';
import { openStories } from '@/state/actions/stories';
import { useT, useLocale, msg, type Key } from '@/i18n';
import { formatKarachi, karachiDay } from '@/domain/time';
import type { InboxItem, InboxKind } from '@/fixtures/social';
import { visibleStoriesFor } from '@/domain/stories';
import { ScreenHeader } from '@/shell/Shell';
import { Avatar } from '@/ui/Avatar';
import { Button, IconButton } from '@/ui/Button';
import { Empty } from '@/ui/Misc';
import { Tabs, TabPanel } from '@/ui/Form';
import { ME } from '@/fixtures/users';

type Tab = 'all' | 'mentions' | 'replies' | 'dms' | 'requests' | 'events' | 'gifts';
const TAB_KINDS: Record<Tab, InboxKind[]> = { all: [], mentions: ['mention'], replies: ['reply'], dms: ['dm'], requests: ['friend-request', 'relationship'], events: ['event'], gifts: ['gift'] };
const KIND_LABEL: Record<InboxKind, Key> = { mention: msg('Mention'), reply: msg('Reply'), dm: msg('Message'), 'friend-request': msg('Friend request'), event: msg('Event'), gift: msg('Gift'), relationship: msg('Relationship') };

export function StoriesRow() {
  const t = useT();
  const stories = useApp(s => s.stories);
  const friends = useApp(s => s.friends);
  const close = useApp(s => s.closeFriends);
  const blocked = useApp(s => s.blocked);
  const now = useApp(s => s.now);
  const viewedBy = useApp(useShallow(s => s.stories.filter(x => x.viewers.some(v => v.userId === ME)).map(x => x.id)));
  const owners = useMemo(() => {
    const vis = visibleStoriesFor(stories, ME, { friends, closeOf: o => (o === 'ayesha' || o === 'hamza' ? [ME] : []), blocked, now });
    return [...new Set(vis.filter(s => s.owner !== ME).map(s => s.owner))];
  }, [stories, friends, close, blocked, now]);
  const mine = stories.filter(s => s.owner === ME && s.expiresAt > now);
  return (
    <section className="stories" aria-label={t('Stories')}>
      <div className="stories-head"><h2>{t('Stories')}</h2><Button size="sm" icon={Plus} onClick={() => openModal({ kind: 'postStory' })}>{t('Add a story')}</Button></div>
      <ul className="stories-row">
        <li>
          <button type="button" className="story-bubble" onClick={() => (mine.length ? openStories(ME) : openModal({ kind: 'postStory' }))} aria-label={mine.length ? t('View your story') : t('Add a story')}>
            <span className={`story-ring ${mine.length ? 'is-mine' : 'is-empty'}`}><Avatar userId={ME} size={56} />{!mine.length && <span className="story-plus"><Plus size={14} aria-hidden="true" /></span>}</span>
            <span className="story-name">{t('Your story')}</span>
          </button>
        </li>
        {mine.length > 0 && <li><button type="button" className="story-bubble" onClick={() => openModal({ kind: 'postStory' })} aria-label={t('Add a story')}><span className="story-ring is-empty"><span className="story-add"><Plus size={22} aria-hidden="true" /></span></span><span className="story-name">{t('Add')}</span></button></li>}
        {owners.map(o => {
          const own = stories.filter(s => s.owner === o && s.expiresAt > now);
          const seen = own.every(s => viewedBy.includes(s.id));
          return (
            <li key={o}>
              <button type="button" className="story-bubble" onClick={() => openStories(o)} aria-label={t('{name}’s story{state}', { name: useApp.getState().users[o]?.name ?? '', state: seen ? ', ' + t('viewed') : ', ' + t('new') })}>
                <span className={`story-ring ${seen ? 'is-seen' : ''}`}><Avatar userId={o} size={56} /></span>
                <span className="story-name ellip">{useApp.getState().users[o]?.name.split(' ')[0]}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ItemRow({ item }: { item: InboxItem }) {
  const t = useT();
  const locale = useLocale();
  const from = useApp(s => (item.from ? s.users[item.from] : undefined));
  const rel = useApp(s => (item.kind === 'relationship' ? s.relationships.find(r => r.with === item.from && r.state === 'pending-in') : undefined));
  const pendingReq = useApp(s => item.kind === 'friend-request' && s.requests.some(r => r.userId === item.from && r.direction === 'in'));
  const today = karachiDay(item.at) === karachiDay(Date.now());
  const time = formatKarachi(item.at, today ? { hour: 'numeric', minute: '2-digit' } : { day: 'numeric', month: 'short' }, locale);
  const open = () => {
    markInboxRead(item.id);
    const tg = item.target;
    if (!tg) return;
    if (tg.route === 'channel') go({ name: 'channel', serverId: tg.serverId, channelId: tg.channelId });
    else if (tg.route === 'dm') go({ name: 'dm', convId: tg.convId });
    else if (tg.route === 'events') go({ name: 'events', serverId: tg.serverId });
    else if (tg.route === 'friends') go({ name: 'friends', tab: 'pending' });
    else go({ name: tg.route });
  };
  const Icon = item.kind === 'event' ? CalendarDays : item.kind === 'gift' ? Gift : item.kind === 'relationship' ? Heart : null;
  return (
    <li className={`irow ${item.unread ? 'is-unread' : ''}`}>
      <button type="button" className="irow-main" onClick={open}>
        <span className="irow-av">{from ? <Avatar userId={from.id} size={40} showPresence /> : Icon ? <span className="ibubble"><Icon size={18} aria-hidden="true" /></span> : null}</span>
        <span className="irow-text">
          <span className="irow-title"><b dir="auto">{from?.name}</b> {t(item.title, item.vars)}</span>
          {item.encrypted ? <span className="irow-prev enc"><Lock size={13} aria-hidden="true" />{t('New message')}</span> : item.preview && <span className="irow-prev ellip" dir="auto">{item.preview}</span>}
          <span className="meta">{t(KIND_LABEL[item.kind])}{item.where ? ` · ${item.where}` : ''}{item.unread ? ` · ${t('Unread')}` : ''}</span>
        </span>
        <span className="irow-time meta">{time}</span>
      </button>
      <div className="irow-actions">
        {pendingReq && item.from && <><Button size="sm" variant="primary" icon={Check} onClick={() => acceptRequest(item.from!)}>{t('Accept')}</Button><Button size="sm" onClick={() => declineRequest(item.from!)}>{t('Decline')}</Button></>}
        {rel && <><Button size="sm" variant="primary" icon={Check} onClick={() => respondRelationship(rel.id, true)}>{t('Accept')}</Button><Button size="sm" onClick={() => respondRelationship(rel.id, false)}>{t('Decline')}</Button></>}
        <IconButton icon={X} size="sm" label={t('Remove from Inbox')} onClick={() => dismissInbox(item.id)} />
      </div>
    </li>
  );
}

export function Inbox() {
  const t = useT();
  const items = useApp(s => s.inbox);
  const [tab, setTab] = useState<Tab>('all');
  const unread = items.filter(i => i.unread).length;
  const count = (k: Tab) => items.filter(i => i.unread && (k === 'all' || TAB_KINDS[k].includes(i.kind))).length;
  const list = items.filter(i => tab === 'all' || TAB_KINDS[tab].includes(i.kind)).sort((a, b) => b.at - a.at);
  const tabs: { value: Tab; label: string; count?: number }[] = [
    { value: 'all', label: t('All') }, { value: 'mentions', label: t('Mentions'), count: count('mentions') }, { value: 'replies', label: t('Replies'), count: count('replies') },
    { value: 'dms', label: t('Messages'), count: count('dms') }, { value: 'requests', label: t('Requests'), count: count('requests') }, { value: 'events', label: t('Events') }, { value: 'gifts', label: t('Gifts') },
  ];
  return (
    <>
      <ScreenHeader icon={<InboxIcon size={20} />} title={t('Inbox')} subtitle={unread ? t('{n} unread', { n: unread }) : t('All caught up')}
        actions={<Button size="sm" icon={CheckCheck} onClick={markAllInboxRead} disabled={!unread}>{t('Mark all as read')}</Button>} />
      <div className="scroll">
        <div className="page">
          <StoriesRow />
          <Tabs tabs={tabs} value={tab} onChange={setTab} label={t('Filter inbox')} idBase="inbox" className="tabs-line" />
          <TabPanel idBase="inbox" value={tab}>
            {list.length ? <ul className="ilist">{list.map(i => <ItemRow key={i.id} item={i} />)}</ul>
              : <Empty icon={InboxIcon} title={t('Nothing here')}>{t('Mentions, replies, messages and requests show up here, newest first.')}</Empty>}
          </TabPanel>
        </div>
      </div>
    </>
  );
}
