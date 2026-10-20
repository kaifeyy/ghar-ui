import { useEffect, useState } from 'react';
import { Search, Pin, Users, Bell, BellOff, Lock, KeyRound, CircleDollarSign, ShieldCheck, Settings, Pencil, Hash } from 'lucide-react';
import { useApp, update, EMPTY } from '@/state/store';
import { channelLocked, canManage } from '@/state/selectors';
import { setRightPanel, openModal, go } from '@/state/actions/ui';
import { markRead } from '@/state/actions/messages';
import { toggleChannelMute } from '@/state/actions/community';
import { useT } from '@/i18n';
import type { Channel } from '@/types/models';
import { ScreenHeader } from '@/shell/Shell';
import { ChannelGlyph, LOCK_LABEL } from '@/shell/Sidebar';
import { IconButton, Button } from '@/ui/Button';
import { Empty, Skeleton, Tag, Note, DemoTag } from '@/ui/Misc';
import { TextField } from '@/ui/Form';
import { MessageList } from './Messages';
import { Composer } from './Composer';
import { VoiceView } from './VoiceView';
import { StageView } from './StageView';
import { ForumView } from './ForumView';
import { ChannelWidget, SupportCard } from './Widgets';
import { TYPING } from '@/fixtures/messages';
import { ME } from '@/fixtures/users';

function useLoad(channelId: string) {
  const state = useApp(s => s.loading[channelId]);
  useEffect(() => {
    const s = useApp.getState();
    if (s.loading[channelId] === 'ready') return;
    const fail = s.failNextLoad;
    update(d => { d.loading[channelId] = 'loading'; d.failNextLoad = false; });
    const id = setTimeout(() => update(d => { d.loading[channelId] = fail ? 'error' : 'ready'; }), 450);
    return () => clearTimeout(id);
  }, [channelId]);
  return state ?? 'loading';
}

export function ChannelView({ serverId, channelId }: { serverId: string; channelId: string }) {
  const t = useT();
  const c = useApp(s => s.channels[channelId]);
  const sv = useApp(s => s.servers[serverId]);
  const lock = useApp(s => (c ? channelLocked(s, c) : false));
  const muted = useApp(s => !!s.prefs.mutedChannels[channelId]);
  const panel = useApp(s => s.rightPanel);
  const manage = useApp(s => canManage(s, serverId, 'manageChannels'));
  const load = useLoad(channelId);
  useEffect(() => { if (load === 'ready' && !lock) markRead(channelId); }, [channelId, load, lock]);
  if (!c || !sv) return <Empty icon={Hash} title={t('Channel not found')}>{t('It may have been deleted or you may no longer have access.')}<Button className="mt16" onClick={() => go({ name: 'inbox' })}>{t('Go home')}</Button></Empty>;

  const actions = (
    <>
      {c.type !== 'voice' && c.type !== 'stage' && <IconButton icon={Search} label={t('Search')} pressed={panel === 'search'} onClick={() => setRightPanel('search')} />}
      {(c.type === 'text' || c.type === 'announcement') && <IconButton icon={Pin} label={t('Pinned messages')} pressed={panel === 'pins'} onClick={() => setRightPanel('pins')} />}
      <IconButton icon={muted ? BellOff : Bell} label={muted ? t('Unmute channel') : t('Mute channel')} pressed={muted} onClick={() => toggleChannelMute(channelId)} />
      {manage && <IconButton icon={Settings} label={t('Edit channel')} onClick={() => openModal({ kind: 'editChannel', channelId })} />}
      <IconButton icon={Users} label={t('Members')} pressed={panel === 'members'} onClick={() => setRightPanel('members')} />
    </>
  );
  const tags = (
    <>
      {sv.e2ee && <Tag icon={ShieldCheck}>{t('Encrypted (label only in this demo)')}</Tag>}
      {c.bridge && <Tag tone="outline">{t('Bridged with {name}', { name: c.bridge.serverName })}</Tag>}
      {c.slowModeSec ? <Tag tone="outline">{t('Slow mode {n}s', { n: c.slowModeSec })}</Tag> : null}
    </>
  );
  const header = <ScreenHeader icon={<ChannelGlyph channel={c} size={20} />} title={c.name} subtitle={c.topic} actions={actions} tags={tags} backTo />;

  if (lock) return <>{header}<LockedChannel channel={c} kind={lock} /></>;
  if (c.type === 'voice') return <>{header}<VoiceView channel={c} /></>;
  if (c.type === 'stage') return <>{header}<StageView channel={c} /></>;
  if (load === 'loading') return <>{header}<div className="loadwrap" aria-busy="true"><span className="sr" role="status">{t('Loading messages…')}</span><Skeleton lines={5} /></div></>;
  if (load === 'error') return <>{header}<Empty icon={Hash} title={t('Couldn’t load this channel')} action={<Button variant="primary" onClick={() => update(d => { delete d.loading[channelId]; })}>{t('Try again')}</Button>}>{t('Check your connection and try again. Your draft is kept.')}</Empty></>;
  if (c.type === 'forum') return <>{header}<ForumView channel={c} /></>;
  return <>{header}<TextChannel channel={c} /></>;
}

function TextChannel({ channel: c }: { channel: Channel }) {
  const t = useT();
  const messages = useApp(s => s.messages[c.id] ?? EMPTY);
  const canPost = useApp(s => c.type !== 'announcement' || canManage(s, c.serverId, 'manageMessages') || canManage(s, c.serverId));
  const timeout = useApp(s => s.servers[c.serverId]?.memberList.find(m => m.userId === ME)?.timeoutUntil);
  const typing = TYPING[c.id] ?? [];
  const support = useApp(s => !!s.supportCard[c.id]);
  const disabled = !canPost ? { reason: t('Only staff can post in announcements. You can still react and read.') } : timeout && timeout > Date.now() ? { reason: t('You’re timed out in this community. You can read but not send messages.') } : null;
  return (
    <div className="chatcol">
      {c.widget && <ChannelWidget channel={c} />}
      {support && <div className="pad16"><SupportCard /></div>}
      <MessageList k={{ scope: 'channel', id: c.id }} messages={messages} serverId={c.serverId}
        empty={<Empty icon={Hash} title={t('Welcome to #{name}', { name: c.name })}>{t('This is the start of the channel. Say salam.')}</Empty>} />
      <Composer k={{ scope: 'channel', id: c.id }} serverId={c.serverId} placeholder={t('Message #{name}', { name: c.name })} disabled={disabled} typing={typing} />
    </div>
  );
}

function LockedChannel({ channel: c, kind }: { channel: Channel; kind: 'role' | 'password' | 'payment' }) {
  const t = useT();
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const roleName = useApp(s => (c.lock?.kind === 'role' ? s.servers[c.serverId]?.roles.find(r => r.id === (c.lock as { roleId: string }).roleId)?.name : undefined));
  const icon = kind === 'role' ? Lock : kind === 'password' ? KeyRound : CircleDollarSign;
  return (
    <div className="scroll"><div className="locked">
      <Empty icon={icon} title={t(LOCK_LABEL[kind])}>
        {kind === 'role' && t('You need the {role} role to see this channel. Ask a moderator if you think you should have it.', { role: roleName ?? '' })}
        {kind === 'payment' && c.lock?.kind === 'payment' && t('Unlock once for Rs {price}. Content stays hidden until the payment succeeds.', { price: c.lock.pricePkr })}
        {kind === 'password' && c.lock?.kind === 'password' && c.lock.hint}
      </Empty>
      {kind === 'payment' && <div className="row g8 center-row"><Button variant="primary" icon={CircleDollarSign} onClick={() => openModal({ kind: 'unlock', channelId: c.id })}>{t('Unlock channel')}</Button><DemoTag>{t('Test payments')}</DemoTag></div>}
      {kind === 'password' && (
        <form className="col g12 locked-form" onSubmit={e => {
          e.preventDefault();
          // Demo check only. The password is not stored or sent anywhere.
          if (pw === 'chai123') { update(d => { d.unlocked[c.id] = true; }); setPw(''); }
          else setErr(t('That password isn’t right.'));
        }}>
          <TextField label={t('Channel password')} type="password" value={pw} onChange={e => { setPw(e.target.value); setErr(null); }} error={err} autoComplete="off" autoFocus />
          <Button type="submit" variant="primary" icon={Pencil}>{t('Unlock')}</Button>
          <Note>{t('Passwords are checked in this browser only and are never saved.')}</Note>
        </form>
      )}
    </div></div>
  );
}

