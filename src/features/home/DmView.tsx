import { useEffect, useState } from 'react';
import { Phone, Video, Search, UserCog, ShieldCheck, PhoneOff, RotateCw, X, Link2, MessageSquare } from 'lucide-react';
import { useApp } from '@/state/store';
import { setRightPanel, openModal, go } from '@/state/actions/ui';
import { markRead, fakeReply } from '@/state/actions/messages';
import { startCall, endCall, dismissEndedCall } from '@/state/actions/calls';
import { useT } from '@/i18n';
import { duration } from '@/domain/format';
import { ScreenHeader } from '@/shell/Shell';
import { Avatar, PresenceLabel } from '@/ui/Avatar';
import { IconButton, Button } from '@/ui/Button';
import { Empty, Tag, DemoTag } from '@/ui/Misc';
import { MessageList } from '@/features/chat/Messages';
import { Composer } from '@/features/chat/Composer';
import { CallControls, Tile } from '@/features/chat/VoiceView';
import { usePresence } from '@/state/selectors';
import { ME } from '@/fixtures/users';

function CallStage({ convId }: { convId: string }) {
  const t = useT();
  const call = useApp(s => (s.call?.convId === convId ? s.call : null));
  const hideIp = useApp(s => s.prefs.privacy.hideIp);
  const [, force] = useState(0);
  useEffect(() => { const i = setInterval(() => force(x => x + 1), 1000); return () => clearInterval(i); }, []);
  if (!call) return null;
  const st = call.state;
  const p2p = call.participants.length <= 4;
  const reasons = { hangup: t('Call ended'), declined: t('They declined the call'), 'no-answer': t('No answer'), failed: t('Couldn’t connect. Check your connection.'), 'mic-blocked': t('Microphone is blocked. Allow it in your browser settings.') } as const;
  return (
    <section className={`callstage is-${st.phase}`} aria-label={t('Call')}>
      <div className="callstage-tiles">{call.participants.map(u => <Tile key={u} userId={u} speaking={st.phase === 'connected' && u !== ME && u === call.participants[1]} />)}</div>
      <div className="row g8 wrap callmeta" role="status">
        {st.phase === 'ringing' && <Tag tone="amber">{call.direction === 'out' ? t('Ringing…') : t('Incoming call')}</Tag>}
        {st.phase === 'connecting' && <Tag tone="amber">{t('Connecting…')}</Tag>}
        {st.phase === 'connected' && <Tag tone="green">{t('In call · {time}', { time: duration(Math.round((Date.now() - st.since) / 1000)) })}</Tag>}
        {st.phase === 'ended' && <Tag tone="red">{reasons[st.reason]}</Tag>}
        <DemoTag>{t('Demo call: no audio or video is sent')}</DemoTag>
        <Tag tone="outline" icon={hideIp ? ShieldCheck : Link2}>{hideIp ? t('Relayed · your IP is hidden') : p2p ? t('Peer-to-peer · people in this call can see your IP') : t('Relayed for more than 4 people')}</Tag>
      </div>
      {st.phase === 'ended' ? (
        <div className="callbar"><Button icon={RotateCw} variant="primary" onClick={() => { dismissEndedCall(); startCall(convId, call.video); }}>{t('Call again')}</Button><Button icon={X} onClick={dismissEndedCall}>{t('Close')}</Button></div>
      ) : st.phase === 'connected' ? <CallControls onLeave={endCall} leaveLabel={t('End call')} />
        : <div className="callbar"><Button variant="danger" icon={PhoneOff} onClick={endCall}>{t('Cancel')}</Button></div>}
    </section>
  );
}

export function DmView({ convId }: { convId: string }) {
  const t = useT();
  const c = useApp(s => s.conversations[convId]);
  const other = useApp(s => (c?.kind === 'dm' ? s.users[c.members[0]!] : undefined));
  const blocked = useApp(s => (c?.kind === 'dm' ? s.blocked.includes(c.members[0]!) : false));
  const panel = useApp(s => s.rightPanel);
  const inCall = useApp(s => s.call?.convId === convId);
  const presence = usePresence(other?.id ?? ME);
  const count = c?.messages.length ?? 0;
  useEffect(() => { markRead(convId); }, [convId, count]);
  if (!c) return <Empty icon={MessageSquare} title={t('Conversation not found')} action={<Button onClick={() => go({ name: 'inbox' })}>{t('Go home')}</Button>} />;
  const name = c.kind === 'group' ? c.name ?? t('Group') : other?.name ?? '';
  const sub = c.kind === 'group' ? t('{n} members', { n: c.members.length }) : undefined;
  return (
    <>
      <ScreenHeader backTo
        icon={c.kind === 'dm' ? <Avatar userId={c.members[0]!} size={28} showPresence /> : <span className="av-group sm" aria-hidden="true">{c.members.filter(m => m !== ME).slice(0, 2).map(m => <Avatar key={m} userId={m} size={20} />)}</span>}
        title={name}
        subtitle={c.kind === 'dm' ? <PresenceLabel kind={presence} /> : sub}
        tags={c.e2ee ? <Tag icon={ShieldCheck}>{t('End-to-end encrypted (label only in this demo)')}</Tag> : undefined}
        actions={<>
          <IconButton icon={Phone} label={c.kind === 'group' ? t('Start group call') : t('Start voice call')} disabled={inCall || blocked} onClick={() => startCall(convId, false)} />
          <IconButton icon={Video} label={t('Start video call')} disabled={inCall || blocked} onClick={() => startCall(convId, true)} />
          <IconButton icon={Search} label={t('Search')} pressed={panel === 'search'} onClick={() => setRightPanel('search')} />
          {c.kind === 'group' ? <IconButton icon={UserCog} label={t('Manage group')} onClick={() => openModal({ kind: 'groupDm', convId })} /> : <IconButton icon={UserCog} label={t('View profile')} onClick={() => go({ name: 'profile', userId: c.members[0]! })} />}
        </>}
      />
      <div className="chatcol">
        <CallStage convId={convId} />
        <MessageList k={{ scope: 'dm', id: convId }} messages={c.messages}
          empty={<Empty icon={MessageSquare} title={t('Say salam to {name}', { name })}>{t('Messages here would be end-to-end encrypted in the real app. In this demo they stay in your browser.')}</Empty>} />
        <ComposerWithReply convId={convId} name={name} blocked={blocked} />
      </div>
    </>
  );
}

function ComposerWithReply({ convId, name, blocked }: { convId: string; name: string; blocked: boolean }) {
  const t = useT();
  const last = useApp(s => s.conversations[convId]?.messages.at(-1));
  const [lastSeen, setLastSeen] = useState(last?.id);
  useEffect(() => { if (last && last.id !== lastSeen) { if (last.author === ME && last.delivery !== 'queued') fakeReply(convId); setLastSeen(last.id); } }, [last, lastSeen, convId]);
  return <Composer k={{ scope: 'dm', id: convId }} placeholder={t('Message {name}', { name })} disabled={blocked ? { reason: t('You blocked this person. Unblock them in Privacy & safety to send messages.') } : null} />;
}
