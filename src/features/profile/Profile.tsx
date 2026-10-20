import { SocialChips } from '@/features/social/SocialLinks';
import { useShallow } from 'zustand/react/shallow';
import { useMemo } from 'react';
import { X, MapPin, MessageSquare, Phone, UserPlus, UserMinus, Ban, Flag, Gift, CircleDollarSign, Pencil, Music, Flame, Play, Plus, LogIn } from 'lucide-react';
import { useApp } from '@/state/store';
import { usePresence } from '@/state/selectors';
import { go, openModal } from '@/state/actions/ui';
import { dmWith, sendRequest, removeFriend, block, unblock } from '@/state/actions/social';
import { startCall } from '@/state/actions/calls';
import { openStories, deleteHighlight } from '@/state/actions/stories';
import { useT, useLocale, msg } from '@/i18n';
import { breakdown } from '@/domain/popularity';
import { fmt } from '@/domain/format';
import { activeCustomStatus } from '@/domain/presence';
import { formatKarachi } from '@/domain/time';
import { ScreenHeader } from '@/shell/Shell';
import { Avatar, PresenceLabel } from '@/ui/Avatar';
import { Art, CommunityIcon } from '@/ui/Art';
import { Button, IconButton } from '@/ui/Button';
import { Empty, Note, Tag, DemoTag } from '@/ui/Misc';
import { BoostedTag } from '@/features/popularity/PopularityPage';
import { REL_LABEL } from '@/features/home/HomeScreens';
import { OTHER_RELATIONSHIPS } from '@/fixtures/social';
import { ME, TITLES } from '@/fixtures/users';
import { Badges } from './Badges';

const NO_MEDIA: { avatar?: string; banner?: string } = {};

export function Profile({ userId }: { userId: string }) {
  const t = useT();
  const locale = useLocale();
  const u = useApp(s => s.users[userId]);
  const presence = usePresence(userId);
  const isMe = userId === ME;
  const media = useApp(s => (isMe ? s.media : NO_MEDIA));
  const events = useApp(s => s.popularity);
  const friends = useApp(s => s.friends);
  const blocked = useApp(s => s.blocked.includes(userId));
  const requests = useApp(s => s.requests);
  const rels = useApp(s => s.relationships);
  const highlights = useApp(useShallow(s => s.highlights.filter(h => h.owner === userId)));
  const stories = useApp(s => s.stories);
  const servers = useApp(s => s.servers);
  const joined = useApp(s => s.joined);
  const now = useApp(s => s.now);
  const myCustom = useApp(s => (isMe ? activeCustomStatus(s.customStatus, s.now) : undefined));
  const showFlag = useApp(s => s.prefs.privacy.flag);
  const suspended = useApp(s => !!s.suspensions[userId]);
  const pop = useMemo(() => breakdown(events, userId), [events, userId]);
  if (!u) return <Empty icon={UserPlus} title={t('Profile not found')} />;
  if (blocked) return <><ScreenHeader title={u.name} backTo /><Empty icon={Ban} title={t('You blocked {name}', { name: u.name })} action={<Button onClick={() => unblock(userId)}>{t('Unblock')}</Button>}>{t('Unblock to see their profile and messages.')}</Empty></>;
  const title = TITLES.find(x => x.id === u.titleId)?.name;
  const isFriend = friends.includes(userId);
  const pending = requests.find(r => r.userId === userId);
  const relList = isMe ? rels.filter(r => r.state === 'accepted' && r.visible).map(r => ({ type: r.type, with: r.with })) : OTHER_RELATIONSHIPS[userId] ?? [];
  const mutual = Object.values(servers).filter(s => joined.includes(s.id) && s.memberList.some(m => m.userId === userId) && !isMe);
  const custom = isMe ? myCustom : u.customStatus;
  const activeStories = stories.filter(s => s.owner === userId && s.expiresAt > now);
  return (
    <>
      <ScreenHeader title={u.name} subtitle={'@' + u.handle} backTo actions={isMe ? <Button size="sm" icon={Pencil} onClick={() => go({ name: 'settings', section: 'profile' })}>{t('Edit profile')}</Button> : undefined} />
      <div className="scroll">
        <article className="profile">
          <div className="pbanner">
            {media.banner ? <img src={media.banner} alt="" /> : <Art seed={'u-' + userId} color={u.color} style={u.bannerStyle ?? 'auto'} w={900} h={260} />}
            {isMe && <Button size="sm" className="pbanner-edit" icon={Pencil} onClick={() => openModal({ kind: 'profileMedia', which: 'banner' })}>{t('Change banner')}</Button>}
          </div>
          <div className="phead">
            <button type="button" className={`pav ${activeStories.length ? 'has-story' : ''}`} onClick={() => (activeStories.length ? openStories(userId) : isMe ? openModal({ kind: 'profileMedia', which: 'avatar' }) : undefined)}
              aria-label={activeStories.length ? t('View {name}’s story', { name: u.name }) : isMe ? t('Change profile picture') : u.name} disabled={!activeStories.length && !isMe}>
              <Avatar userId={userId} size={112} showPresence />
            </button>
            <div className="pname">
              <h2 dir="auto">{u.name}{showFlag && u.flag && <span className="flag" title={u.flag} aria-label={t('Flag: {f}', { f: u.flag })}>{u.flag === 'PK' ? <Flag size={18} aria-hidden="true" /> : <MapPin size={18} aria-hidden="true" />}</span>}</h2>
              <p className="row g8 wrap"><span className="meta ltr">@{u.handle}</span>{title && <Tag>{title}</Tag>}{u.bot && <Tag tone="outline">{t('Bot')}</Tag>}</p>
              <p className="row g8 wrap small"><PresenceLabel kind={presence} />{u.activity && <span className="muted">· {t(({ studying: msg('Studying {x}'), listening: msg('Listening to {x}'), playing: msg('Playing {x}'), hosting: msg('Hosting {x}'), coding: msg('Coding {x}') } as const)[u.activity.kind], { x: u.activity.label })}{u.activity.with?.length ? ' ' + t('with {names}', { names: u.activity.with.map(w => useApp.getState().users[w]?.name.split(' ')[0]).join(', ') }) : ''}</span>}
                {u.activity?.join && <Button size="sm" icon={LogIn} onClick={() => go({ name: 'channel', serverId: u.activity!.join!.serverId, channelId: u.activity!.join!.channelId })}>{t('Join')}</Button>}</p>
              {custom && <p className="small">{custom.emoji} {custom.text}</p>}
            </div>
            <div className="pactions">
              {!isMe && !u.bot && <>
                <Button variant="primary" icon={MessageSquare} onClick={() => go({ name: 'dm', convId: dmWith(userId) })}>{t('Message')}</Button>
                <IconButton icon={Phone} label={t('Call')} onClick={() => { const c = dmWith(userId); go({ name: 'dm', convId: c }); startCall(c); }} />
                {isFriend ? <IconButton icon={UserMinus} label={t('Remove friend')} onClick={() => removeFriend(userId)} /> : pending ? <Tag>{pending.direction === 'out' ? t('Request sent') : t('Wants to be friends')}</Tag> : <IconButton icon={UserPlus} label={t('Add friend')} onClick={() => sendRequest(u.handle)} />}
                <IconButton icon={Ban} label={t('Block')} onClick={() => block(userId)} />
                <IconButton icon={Flag} label={t('Report')} onClick={() => openModal({ kind: 'report', target: { kind: 'user', userId } })} />
              </>}
            </div>
          </div>
          <div className="pbody">
            <Badges ids={u.badges} />
            {u.bio && <p className="bio plain" dir="auto">{u.bio}</p>}
            {suspended && <Note tone="warn" title={t('Account suspended')}>{t('This account is suspended by the Ghar team and can’t post or message right now.')}</Note>}
            <SocialChips owner={userId} />
            <div className="pgrid">
              <section className="pcard" aria-labelledby="p-pop">
                <h3 id="p-pop" className="label">{t('Popularity')}</h3>
                <b className="pop-mid tnum"><Flame size={18} aria-hidden="true" />{fmt(pop.total)}</b>
                <BoostedTag points={pop.boosted} />
                {!isMe && !u.bot && <div className="row g8 wrap mt8"><Button size="sm" icon={Gift} onClick={() => openModal({ kind: 'gift', to: userId })}>{t('Send gift')}</Button><Button size="sm" icon={CircleDollarSign} onClick={() => openModal({ kind: 'tip', to: userId })}>{t('Tip')}</Button></div>}
                {isMe && <Button size="sm" variant="ghost" className="mt8" onClick={() => go({ name: 'popularity' })}>{t('See breakdown')}</Button>}
              </section>
              {u.song && (
                <section className="pcard" aria-labelledby="p-song">
                  <h3 id="p-song" className="label">{t('Song of the day')}</h3>
                  <div className="row g12"><span className="song-ic"><Music size={18} aria-hidden="true" /></span><b className="grow">{u.song}</b><IconButton icon={Play} size="sm" label={t('Play 30-second preview')} onClick={() => undefined} /></div>
                  <DemoTag>{t('Preview unavailable · no licensed catalogue connected')}</DemoTag>
                </section>
              )}
              <section className="pcard" aria-labelledby="p-since">
                <h3 id="p-since" className="label">{t('Member since')}</h3>
                <span>{formatKarachi(Date.parse(u.joinedAt), { dateStyle: 'long' }, locale)}</span>
                {u.city && <span className="meta">{u.city}</span>}
              </section>
            </div>
            {(highlights.length > 0 || isMe) && (
              <section aria-labelledby="p-hl">
                <h3 id="p-hl" className="label">{t('Highlights')}</h3>
                <ul className="highlights">
                  {highlights.map(h => (
                    <li key={h.id} className="hl">
                      <button type="button" className="hl-btn" onClick={() => openStories(userId, h.id)} aria-label={t('Play highlight {name}, {n} stories', { name: h.name, n: h.storyIds.length })}>
                        <span className="hl-cover"><Art seed={h.storyIds[0] ?? h.id} color={u.color} style="fun" w={80} h={80} /></span>
                        <span className="hl-name ellip">{h.name}</span>
                      </button>
                      {isMe && <button type="button" className="hl-del" onClick={() => deleteHighlight(h.id)} aria-label={t('Delete highlight {name}', { name: h.name })}><X size={14} aria-hidden="true" /></button>}
                    </li>
                  ))}
                  {isMe && <li className="hl"><button type="button" className="hl-btn" onClick={() => openModal({ kind: 'postStory' })}><span className="hl-cover is-add"><Plus size={20} aria-hidden="true" /></span><span className="hl-name">{t('New story')}</span></button></li>}
                </ul>
                {isMe && highlights.length === 0 && <p className="meta">{t('Save a story to a highlight from the story viewer.')}</p>}
              </section>
            )}
            {relList.length > 0 && (
              <section aria-labelledby="p-rel">
                <h3 id="p-rel" className="label">{t('Relationships')}</h3>
                <ul className="rel-list">{relList.map(r => (
                  <li key={r.with + r.type}><button type="button" className="person" onClick={() => go({ name: 'profile', userId: r.with })}><Avatar userId={r.with} size={32} /><span className="person-text"><b>{useApp.getState().users[r.with]?.name}</b><em>{t(REL_LABEL[r.type])}</em></span></button></li>
                ))}</ul>
              </section>
            )}
            {mutual.length > 0 && (
              <section aria-labelledby="p-mut">
                <h3 id="p-mut" className="label">{t('Mutual communities')}</h3>
                <ul className="row g8 wrap">{mutual.map(s => <li key={s.id}><button type="button" className="chip-link" onClick={() => go({ name: 'channel', serverId: s.id, channelId: s.categories[0]?.channelIds[0] ?? '' })}><CommunityIcon id={s.id} name={s.name} color={s.color} size={24} />{s.name}</button></li>)}</ul>
              </section>
            )}
          </div>
        </article>
      </div>
    </>
  );
}
