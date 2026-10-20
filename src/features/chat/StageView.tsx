import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Hand, Radio, PhoneOff, Mic, UserPlus, UserMinus, Video, MonitorUp, Eye, PenLine } from 'lucide-react';
import type { Channel } from '@/types/models';
import { useApp, update, EMPTY } from '@/state/store';
import { joinVoice, leaveVoice, toggleMute, toggleCamera, toggleShare } from '@/state/actions/audio';
import { toast } from '@/state/actions/ui';
import { useT } from '@/i18n';
import { Avatar } from '@/ui/Avatar';
import { Button, IconButton } from '@/ui/Button';
import { DemoTag, Note, Tag } from '@/ui/Misc';
import { MessageList } from './Messages';
import { Composer } from './Composer';
import { Whiteboard } from './Widgets';
import { ME } from '@/fixtures/users';

const REACTIONS = ['👏', '🔥', '❤️', '😂'];

export function StageView({ channel: c }: { channel: Channel }) {
  const t = useT();
  const stage = useApp(useShallow(s => s.stage));
  const voice = useApp(s => s.voice);
  const isHost = useApp(s => s.servers[c.serverId]?.owner === ME || s.servers[c.serverId]?.memberList.find(m => m.userId === ME)?.roleIds.some(r => r.endsWith('-admin') || r.endsWith('-mod')) === true);
  const messages = useApp(s => s.messages[c.id] ?? EMPTY);
  const event = useApp(s => s.events.find(e => e.channelId === c.id));
  const here = voice?.channelId === c.id;
  const onStage = stage.speakers.includes(ME);
  const [floats, setFloats] = useState<{ id: number; e: string }[]>([]);
  const [board, setBoard] = useState(false);
  const speakers = c.live ? ['sara', 'bilal', ...(onStage ? [ME] : [])] : stage.speakers;

  const raise = () => {
    update(s => { s.stage.handRaised = !s.stage.handRaised; s.stage.queue = s.stage.handRaised ? [...s.stage.queue, ME] : s.stage.queue.filter(u => u !== ME); });
    toast(stage.handRaised ? 'Hand lowered' : 'Hand raised. The host will see you in the queue.', { tone: 'info' });
  };
  const invite = (u: string) => update(s => { s.stage.queue = s.stage.queue.filter(x => x !== u); if (!s.stage.speakers.includes(u)) s.stage.speakers.push(u); if (u === ME) s.stage.handRaised = false; });
  const toAudience = (u: string) => update(s => { s.stage.speakers = s.stage.speakers.filter(x => x !== u); });
  const react = (e: string) => { const id = Date.now(); setFloats(f => [...f.slice(-6), { id, e }]); setTimeout(() => setFloats(f => f.filter(x => x.id !== id)), 2200); };

  return (
    <div className="stagecol">
      <div className="vsplit">
        <div className="vmain scroll">
          <div className="stage-head">
            <Tag tone={here ? 'green' : 'neutral'} icon={Radio}>{c.live ? t('Live') : t('Stage')}</Tag>
            {event && <span className="muted small">{event.name}</span>}
            <span className="grow" />
            <span className="meta tnum"><Eye size={14} aria-hidden="true" /> {t('{n} listening', { n: stage.listeners + (here ? 1 : 0) })}</span>
            <DemoTag>{t('Demo: no audio or video')}</DemoTag>
          </div>
          {c.live && (
            <div className="live-screen" aria-label={t('Live stream')}>
              <div className="live-main"><Avatar userId="sara" size={88} /><span>{t('{name} is presenting (placeholder, no video)', { name: 'Dr. Sara Malik' })}</span></div>
              <div className="live-floats" aria-hidden="true">{floats.map(f => <span key={f.id}>{f.e}</span>)}</div>
              <p className="meta">{t('Host plus up to 4 co-hosts can share camera or screen. Large audiences would watch a delayed stream.')}</p>
            </div>
          )}
          <h3 className="label">{t('On stage')}</h3>
          <ul className="stage-grid">
            {speakers.map(u => (
              <li key={u} className={`speaker ${u === 'zainab' ? 'is-speaking' : ''}`}>
                <Avatar userId={u} size={72} />
                <b className="ellip" dir="auto">{useApp.getState().users[u]?.name}</b>
                <span className="meta">{u === 'bilal' || u === 'sara' ? t('Host') : u === 'zainab' ? t('Speaking') : t('Speaker')}</span>
                {isHost && u !== ME && <IconButton icon={UserMinus} size="sm" label={t('Move {name} to audience', { name: useApp.getState().users[u]?.name ?? '' })} onClick={() => toAudience(u)} />}
              </li>
            ))}
          </ul>
          <h3 className="label mt24">{t('Speaker queue')}</h3>
          {stage.queue.length ? (
            <ol className="queue">
              {stage.queue.map((u, i) => (
                <li key={u} className="row g12">
                  <span className="tnum meta">{i + 1}</span><Avatar userId={u} size={32} /><span className="grow ellip">{useApp.getState().users[u]?.name}{u === ME ? ` (${t('you')})` : ''}</span>
                  {isHost && <Button size="sm" icon={UserPlus} onClick={() => invite(u)}>{t('Invite to speak')}</Button>}
                </li>
              ))}
            </ol>
          ) : <p className="meta">{t('No raised hands.')}</p>}
          {board && <Whiteboard hostId={speakers[0] ?? 'bilal'} />}
        </div>
        <aside className="vside stage-chat" aria-label={t('Stage chat')}>
          <MessageList k={{ scope: 'channel', id: c.id }} messages={messages} serverId={c.serverId} empty={<p className="meta pad16">{t('Chat with the audience here.')}</p>} />
          <Composer k={{ scope: 'channel', id: c.id }} serverId={c.serverId} placeholder={t('Chat during the stage')} />
        </aside>
      </div>
      <div className="callbar" role="toolbar" aria-label={t('Stage controls')}>
        {!here ? (
          <Button variant="primary" icon={Radio} onClick={() => { if (!useApp.getState().audio.micMuted) toggleMute(); joinVoice(c.id); }}>{t('Join as listener')}</Button>
        ) : (
          <>
            {!onStage && <Button icon={Hand} aria-pressed={stage.handRaised} onClick={raise}>{stage.handRaised ? t('Lower hand') : t('Raise hand')}</Button>}
            {onStage && <Button icon={Mic} onClick={toggleMute}>{useApp.getState().audio.micMuted ? t('Unmute') : t('Mute')}</Button>}
            {onStage && c.live && <><IconButton icon={Video} label={t('Camera')} onClick={() => toggleCamera()} /><IconButton icon={MonitorUp} label={t('Share screen')} onClick={() => toggleShare()} /></>}
            <div className="row g4" role="group" aria-label={t('Send a reaction')}>{REACTIONS.map(e => <button key={e} type="button" className="react-btn" aria-label={t('React {emoji}', { emoji: e })} onClick={() => react(e)}>{e}</button>)}</div>
            <IconButton icon={PenLine} label={t('Whiteboard')} pressed={board} onClick={() => setBoard(b => !b)} />
            <Button variant="danger" icon={PhoneOff} onClick={leaveVoice}>{t('Leave quietly')}</Button>
          </>
        )}
      </div>
      {here && !onStage && stage.handRaised && <Note tone="info" className="stage-note">{t('Your hand is up. You’re #{n} in the queue.', { n: stage.queue.indexOf(ME) + 1 })}</Note>}
    </div>
  );
}
