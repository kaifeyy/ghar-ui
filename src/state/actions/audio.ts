import { update, get } from '../store';
import { toast, openModal } from './ui';

/** Mute only toggles the microphone. While deafened, unmuting also undeafens (you can't talk without hearing). */
export function toggleMute() {
  update(s => {
    const a = s.audio;
    if (a.deafened && a.micMuted) { a.deafened = false; a.micBeforeDeafen = null; a.micMuted = false; return; }
    a.micMuted = !a.micMuted;
  });
}
/** Deafen mutes the microphone; undeafen restores the microphone state from before deafening. */
export function toggleDeafen() {
  update(s => {
    const a = s.audio;
    if (!a.deafened) { a.micBeforeDeafen = a.micMuted; a.deafened = true; a.micMuted = true; }
    else { a.deafened = false; a.micMuted = a.micBeforeDeafen ?? false; a.micBeforeDeafen = null; }
  });
}
export function setDevice(kind: 'input' | 'output', name: string) {
  update(s => { if (kind === 'input') s.audio.inputDevice = name; else s.audio.outputDevice = name; });
}
export function setAudioPref(k: 'pushToTalk' | 'noiseSuppression', v: boolean) { update(s => { s.audio[k] = v; }); }

function needsIpWarning(): boolean { const s = get(); return s.prefs.privacy.warnVideo && !s.ipWarningSeen && !s.prefs.privacy.hideIp; }

/** Camera / screen share are shared by voice sessions and calls: one source of truth in `audio`. */
export function toggleCamera(skipWarning = false) {
  const s = get();
  if (!s.audio.camera && !skipWarning && needsIpWarning()) { openModal({ kind: 'ipWarning', then: 'video' }); return; }
  const people = s.voice ? (s.voiceOccupancy[s.voice.channelId]?.length ?? 0) + 1 : s.call ? s.call.participants.length : 0;
  if (!s.audio.camera && people > 4) { toast('Video pauses when more than 4 people are here. Voice continues.', { tone: 'info' }); return; }
  update(d => { d.audio.camera = !d.audio.camera; if (d.call) d.call.video = d.audio.camera; });
}
export function toggleShare(skipWarning = false) {
  const s = get();
  if (!s.audio.share && !skipWarning && needsIpWarning()) { openModal({ kind: 'ipWarning', then: 'share' }); return; }
  update(d => { d.audio.share = !d.audio.share; if (d.call) d.call.share = d.audio.share; });
}
export function acknowledgeIpWarning(then: 'video' | 'share', hideIp: boolean) {
  update(s => { s.ipWarningSeen = true; s.prefs.privacy.hideIp = hideIp; s.modal = null; });
  if (then === 'video') toggleCamera(true); else toggleShare(true);
}

export function joinVoice(channelId: string) {
  const s = get();
  if (s.call) { toast('End your call before joining a voice channel.', { tone: 'warn' }); return; }
  if (s.net !== 'online') { toast('You’re offline. Voice will connect when you’re back online.', { tone: 'warn' }); return; }
  update(d => { d.voice = { phase: 'connecting', channelId, since: Date.now() }; });
  setTimeout(() => update(d => { if (d.voice?.channelId === channelId && d.voice.phase === 'connecting') d.voice = { phase: 'connected', channelId, since: Date.now() }; }), 900);
}
export function leaveVoice() {
  update(s => { s.voice = null; s.audio.camera = false; s.audio.share = false; s.stage.handRaised = false; });
  toast('Left voice');
}
