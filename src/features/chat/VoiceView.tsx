import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Mic, MicOff, Headphones, HeadphoneOff, Video, VideoOff, MonitorUp, PhoneOff, Ear, Volume2, ShieldCheck, Users } from 'lucide-react';
import type { Channel } from '@/types/models';
import { useApp } from '@/state/store';
import { joinVoice, leaveVoice, toggleMute, toggleDeafen, toggleCamera, toggleShare } from '@/state/actions/audio';
import { useT } from '@/i18n';
import { Avatar } from '@/ui/Avatar';
import { Button } from '@/ui/Button';
import { DemoTag, Note, Tag } from '@/ui/Misc';
import { Menu, useMenu } from '@/ui/Overlay';
import { Pomodoro, Whiteboard } from './Widgets';
import { ME } from '@/fixtures/users';

export function CallControls({ onLeave, leaveLabel }: { onLeave: () => void; leaveLabel?: string }) {
  const t = useT();
  const a = useApp(useShallow(s => ({ m: s.audio.micMuted, d: s.audio.deafened, c: s.audio.camera, sh: s.audio.share, ptt: s.audio.pushToTalk })));
  return (
    <div className="callbar" role="toolbar" aria-label={t('Call controls')}>
      {a.ptt && <Tag tone="outline">{t('Push to talk · hold V')}</Tag>}
      <div className="cgroup">
        <Ctl icon={a.m ? MicOff : Mic} label={t('Mute microphone')} text={a.m ? t('Unmute') : t('Mute')} pressed={a.m} danger={a.m} onClick={toggleMute} />
        <Ctl icon={a.d ? HeadphoneOff : Headphones} label={t('Deafen')} text={a.d ? t('Undeafen') : t('Deafen')} pressed={a.d} danger={a.d} onClick={toggleDeafen} />
        <Ctl icon={a.c ? Video : VideoOff} label={t('Camera')} text={a.c ? t('Camera on') : t('Camera off')} pressed={a.c} onClick={() => toggleCamera()} />
        <Ctl icon={MonitorUp} label={t('Share screen')} text={a.sh ? t('Sharing') : t('Share')} pressed={a.sh} onClick={() => toggleShare()} />
      </div>
      <Button variant="danger" icon={PhoneOff} onClick={onLeave}>{leaveLabel ?? t('Leave')}</Button>
    </div>
  );
}
function Ctl({ icon: I, label, text, pressed, danger, onClick }: { icon: typeof Mic; label: string; text: string; pressed: boolean; danger?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`ctl ${pressed ? 'is-on' : ''} ${danger ? 'is-danger' : ''}`} aria-pressed={pressed} aria-label={label} onClick={onClick}>
      <I size={20} aria-hidden="true" /><span>{text}</span>
    </button>
  );
}

export function Tile({ userId, speaking, whisper, onMenu }: { userId: string; speaking?: boolean; whisper?: boolean; onMenu?: (el: HTMLElement) => void }) {
  const t = useT();
  const name = useApp(s => s.users[userId]?.name ?? '');
  const self = userId === ME;
  const a = useApp(useShallow(s => ({ m: s.audio.micMuted, c: s.audio.camera, sh: s.audio.share })));
  const muted = self ? a.m : userId === 'zainab';
  const cam = self && a.c;
  return (
    <div className={`tile-v ${speaking ? 'is-speaking' : ''}`}>
      {self && a.sh ? <div className="tile-share"><MonitorUp size={32} aria-hidden="true" /><span>{t('You are sharing your screen (demo)')}</span></div>
        : cam ? <div className="tile-cam" aria-label={t('Camera preview placeholder')}><Avatar userId={userId} size={72} /><span className="meta">{t('Camera on (demo, no video)')}</span></div>
        : <Avatar userId={userId} size={72} />}
      <div className="tile-foot">
        <span className="ellip" dir="auto">{name}{self ? ` (${t('you')})` : ''}</span>
        {speaking && <span className="tag tag-green">{t('Speaking')}</span>}
        {whisper && <span className="tag" title={t('Whispering')}><Ear size={12} aria-hidden="true" />{t('Whisper')}</span>}
        {muted && <MicOff size={14} aria-label={t('Muted')} className="bad" />}
      </div>
      {onMenu && !self && <button type="button" className="tile-more" aria-label={t('Options for {name}', { name })} onClick={e => onMenu(e.currentTarget)}>⋯</button>}
    </div>
  );
}

export function VoiceView({ channel: c }: { channel: Channel }) {
  const t = useT();
  const occupants = useApp(useShallow(s => s.voiceOccupancy[c.id] ?? []));
  const voice = useApp(s => s.voice);
  const whisperAllowed = useApp(s => s.servers[c.serverId]?.whisperEnabled ?? true);
  const [whisper, setWhisper] = useState<string | null>(null);
  const menu = useMenu();
  const [menuUser, setMenuUser] = useState<string | null>(null);
  const here = voice?.channelId === c.id;
  const people = here ? [ME, ...occupants] : occupants;
  const [vol, setVol] = useState<Record<string, number>>({});

  if (!here) return (
    <div className="scroll"><div className="joinvoice">
      <div className="avstack" aria-hidden="true">{occupants.slice(0, 5).map(u => <Avatar key={u} userId={u} size={56} />)}</div>
      <h2>{c.name}</h2>
      <p className="muted">{occupants.length ? t('{n} people are here.', { n: occupants.length }) : t('No one is here yet.')}{c.widget === 'pomodoro' ? ' ' + t('Focus room: microphones stay off during focus rounds.') : ''}</p>
      <div className="row g8 wrap center-row">
        <Button variant="primary" icon={Volume2} onClick={() => joinVoice(c.id)} disabled={!!voice && voice.channelId !== c.id}>{t('Join voice')}</Button>
        <Button icon={MicOff} onClick={() => { if (!useApp.getState().audio.micMuted) toggleMute(); joinVoice(c.id); }}>{t('Join muted')}</Button>
      </div>
      {voice && voice.channelId !== c.id && <Note tone="info">{t('You’re in another voice channel. Joining here moves you.')}</Note>}
      <p className="meta row g8"><ShieldCheck size={14} aria-hidden="true" />{t('Voice channels are relayed through Ghar servers so other members never see your IP.')}<DemoTag>{t('Demo: no audio is sent')}</DemoTag></p>
    </div></div>
  );

  return (
    <div className="voicecol">
      {voice?.phase === 'connecting' && <Note tone="info">{t('Connecting to voice…')}</Note>}
      {voice?.phase === 'reconnecting' && <Note tone="warn">{t('Connection lost. Reconnecting voice…')}</Note>}
      <div className="vsplit">
        <div className="vmain scroll">
          {c.widget === 'pomodoro' && <Pomodoro />}
          {c.widget === 'whiteboard' && <Whiteboard hostId={people[1] ?? ME} />}
          <div className={`tiles n${Math.min(people.length, 4)}`} role="list" aria-label={t('People in {name}', { name: c.name })}>
            {people.map(u => <div role="listitem" key={u}><Tile userId={u} speaking={u === 'ayesha'} whisper={whisper === u || (u === ME && !!whisper)} onMenu={el => { setMenuUser(u); menu.open(el); }} /></div>)}
          </div>
          {people.length > 4 && <p className="meta pad16">{t('Video and screen share work for up to 4 people. With more, voice continues and video pauses.')}</p>}
        </div>
        <aside className="vside" aria-label={t('Voice details')}>
          <h3 className="label">{t('In this channel')}</h3>
          <ul className="col g8">{people.map(u => <li key={u} className="row g8"><Avatar userId={u} size={28} showPresence /><span className="ellip grow">{useApp.getState().users[u]?.name}</span></li>)}</ul>
          <h3 className="label mt24">{t('Privacy')}</h3>
          <p className="meta">{t('Voice is relayed, so your IP stays hidden here. Camera and screen share with up to 4 people go peer-to-peer and can reveal your IP to them.')}</p>
          <p className="meta mt8 row g8"><Users size={14} aria-hidden="true" />{t('Whisper is {state} in this community.', { state: whisperAllowed ? t('on') : t('off') })}</p>
        </aside>
      </div>
      <CallControls onLeave={leaveVoice} />
      {menu.isOpen && menuUser && <Menu label={t('Voice options')} anchor={menu.anchor} onClose={menu.close} items={[
        ...(whisperAllowed ? [{ id: 'w', label: whisper === menuUser ? t('Stop whispering') : t('Whisper to {name}', { name: useApp.getState().users[menuUser]?.name ?? '' }), icon: <Ear size={16} />, onSelect: () => setWhisper(w => (w === menuUser ? null : menuUser)) }] : []),
        ...[50, 100, 150].map(v => ({ id: 'v' + v, label: t('Volume {n}%', { n: v }), checked: (vol[menuUser] ?? 100) === v, onSelect: () => setVol(x => ({ ...x, [menuUser]: v })) })),
      ]} />}
    </div>
  );
}
