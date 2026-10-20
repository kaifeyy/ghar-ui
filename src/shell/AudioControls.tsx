import { useRef } from 'react';
import { Mic, MicOff, Headphones, HeadphoneOff, Settings, PhoneOff, Video, VideoOff, MonitorUp, MoreHorizontal, Signal, Loader } from 'lucide-react';
import { useApp } from '@/state/store';
import { toggleMute, toggleDeafen, toggleCamera, toggleShare, leaveVoice, setDevice } from '@/state/actions/audio';
import { endCall } from '@/state/actions/calls';
import { go } from '@/state/actions/ui';
import { useT } from '@/i18n';
import { IconButton } from '@/ui/Button';
import { Menu, useMenu } from '@/ui/Overlay';
import { DemoTag } from '@/ui/Misc';

const INPUTS = ['Default microphone', 'Headset microphone', 'Laptop microphone'];
const OUTPUTS = ['Default speakers', 'Headset', 'HDMI display'];

/** Persistent audio controls in up400, synchronised with voice channels and calls (single source of truth: state.audio). */
export function AudioControls() {
  const t = useT();
  const audio = useApp(s => s.audio);
  const voice = useApp(s => s.voice);
  const call = useApp(s => s.call);
  const channel = useApp(s => (s.voice ? s.channels[s.voice.channelId] : undefined));
  const server = useApp(s => (channel ? s.servers[channel.serverId] : undefined));
  const callName = useApp(s => {
    if (!s.call) return '';
    const c = s.conversations[s.call.convId];
    return c?.kind === 'group' ? c.name ?? '' : s.users[c?.members[0] ?? '']?.name ?? '';
  });
  const lastSettings = useApp(s => s.prefs.lastSettings);
  const more = useMenu();
  const moreBtn = useRef<HTMLButtonElement>(null);

  const session = voice || (call && call.state.phase !== 'ended');
  const phase = voice ? voice.phase : call?.state.phase;
  const stateLabel = phase === 'connected' ? t('Connected') : phase === 'reconnecting' ? t('Reconnecting…') : phase === 'ringing' ? t('Ringing…') : t('Connecting…');

  const openSession = () => {
    if (voice && channel) go({ name: 'channel', serverId: channel.serverId, channelId: channel.id });
    else if (call) go({ name: 'dm', convId: call.convId });
  };

  return (
    <div className="audio" role="group" aria-label={t('Audio and settings')}>
      {session && (
        <div className={`session is-${phase}`}>
          <button type="button" className="session-id" onClick={openSession} aria-label={t('Open session: {name}, {state}', { name: voice ? channel?.name ?? '' : callName, state: stateLabel })}>
            {phase === 'connected' ? <Signal size={16} aria-hidden="true" className="ok" /> : <Loader size={16} aria-hidden="true" className="spin" />}
            <span className="session-text">
              <b className="ellip">{voice ? channel?.name : callName}</b>
              <em className="ellip">{stateLabel}{voice && server ? ` · ${server.name}` : ''}</em>
            </span>
          </button>
          <DemoTag>{t('Demo audio')}</DemoTag>
          <IconButton icon={audio.camera ? Video : VideoOff} label={t('Camera')} tipText={audio.camera ? t('Turn camera off') : t('Turn camera on')} pressed={audio.camera} size="sm" onClick={() => toggleCamera()} className="hide-narrow" />
          <IconButton icon={MonitorUp} label={t('Share screen')} tipText={audio.share ? t('Stop sharing') : t('Share your screen')} pressed={audio.share} size="sm" onClick={() => toggleShare()} className="hide-narrow" />
          <IconButton icon={PhoneOff} label={t('Disconnect')} tone="danger" size="sm" onClick={() => (voice ? leaveVoice() : endCall())} />
        </div>
      )}
      <IconButton icon={audio.micMuted ? MicOff : Mic} label={t('Mute microphone')} tipText={audio.micMuted ? t('Unmute microphone') : t('Mute microphone')} pressed={audio.micMuted} tone={audio.micMuted ? 'danger' : 'default'} onClick={toggleMute} />
      <IconButton icon={audio.deafened ? HeadphoneOff : Headphones} label={t('Deafen')} tipText={audio.deafened ? t('Undeafen') : t('Deafen (mutes your microphone too)')} pressed={audio.deafened} tone={audio.deafened ? 'danger' : 'default'} onClick={toggleDeafen} />
      <IconButton ref={moreBtn} icon={MoreHorizontal} label={t('More audio options')} aria-haspopup="menu" aria-expanded={more.isOpen} onClick={e => more.open(e.currentTarget)} className="audio-more" />
      <IconButton icon={Settings} label={t('Settings')} tipText={session ? t('Voice & video settings') : t('Settings')} onClick={() => go({ name: 'settings', section: session ? 'voice' : lastSettings })} />
      {more.isOpen && (
        <Menu label={t('More audio options')} anchor={more.anchor} onClose={more.close} items={[
          { id: 'cam', label: audio.camera ? t('Turn camera off') : t('Turn camera on'), icon: audio.camera ? <VideoOff size={16} /> : <Video size={16} />, disabled: !session, onSelect: () => toggleCamera(), ...(session ? {} : { hint: t('Join a call first') }) },
          { id: 'share', label: audio.share ? t('Stop sharing') : t('Share your screen'), icon: <MonitorUp size={16} />, disabled: !session, onSelect: () => toggleShare() },
          'sep',
          ...INPUTS.map(n => ({ id: 'in-' + n, label: `${t('Input')}: ${n}`, checked: audio.inputDevice === n, onSelect: () => setDevice('input', n) })),
          'sep',
          ...OUTPUTS.map(n => ({ id: 'out-' + n, label: `${t('Output')}: ${n}`, checked: audio.outputDevice === n, onSelect: () => setDevice('output', n) })),
          'sep',
          { id: 'vs', label: t('Voice & video settings'), icon: <Settings size={16} />, onSelect: () => go({ name: 'settings', section: 'voice' }) },
        ]} />
      )}
    </div>
  );
}
