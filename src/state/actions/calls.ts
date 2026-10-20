import { update, get } from '../store';
import { uid } from '@/domain/rng';
import { ME } from '@/fixtures/users';
import { toast, openModal, closeModal } from './ui';

let ringTimer: ReturnType<typeof setTimeout> | undefined;

/** Demo call state machine: ringing → connected | declined | no-answer | failed | mic-blocked. No audio is sent. */
export function startCall(convId: string, video = false) {
  const s = get();
  if (s.voice) { toast('Leave the voice channel before starting a call.', { tone: 'warn' }); return; }
  if (s.call && s.call.state.phase !== 'ended') { toast('You’re already in a call.', { tone: 'warn' }); return; }
  const conv = s.conversations[convId];
  if (!conv) return;
  const participants = conv.kind === 'group' ? [...new Set([ME, ...conv.members])] : [ME, conv.members[0]!];
  if (s.net !== 'online') {
    update(d => { d.call = { id: uid('call'), convId, participants, direction: 'out', state: { phase: 'ended', reason: 'failed', at: Date.now() }, video, share: false }; });
    return;
  }
  const id = uid('call');
  update(d => { d.call = { id, convId, participants, direction: 'out', state: { phase: 'ringing', since: Date.now() }, video: false, share: false }; d.audio.camera = false; d.audio.share = false; });
  clearTimeout(ringTimer);
  // deterministic demo outcome: Hamza is busy (declines), Usman never answers, others pick up
  const other = participants.find(p => p !== ME);
  ringTimer = setTimeout(() => {
    update(d => {
      if (d.call?.id !== id || d.call.state.phase !== 'ringing') return;
      if (other === 'hamza') d.call.state = { phase: 'ended', reason: 'declined', at: Date.now() };
      else if (other === 'usman') d.call.state = { phase: 'ended', reason: 'no-answer', at: Date.now() };
      else d.call.state = { phase: 'connected', since: Date.now() };
    });
    if (video && get().call?.state.phase === 'connected') import('./audio').then(a => a.toggleCamera());
  }, other === 'usman' ? 6000 : 2200);
}

export function endCall() {
  const c = get().call;
  if (!c) return;
  clearTimeout(ringTimer);
  const connected = c.state.phase === 'connected';
  const since = c.state.phase === 'connected' ? c.state.since : Date.now();
  const missed = c.state.phase === 'ringing' || (c.state.phase === 'ended' && (c.state.reason === 'no-answer' || c.state.reason === 'declined'));
  update(d => {
    d.calls.unshift({ id: c.id, convId: c.convId, participants: c.participants, video: c.video, direction: c.direction, missed: !connected && missed, startedAt: since, durationSec: connected ? Math.round((Date.now() - since) / 1000) : 0 });
    d.call = null; d.audio.camera = false; d.audio.share = false;
  });
  if (connected) toast('Call ended');
}

export function simulateIncoming(convId = 'dm-zainab') {
  const s = get();
  if (s.call || s.voice) { toast('Finish your current call first.', { tone: 'warn' }); return; }
  const conv = s.conversations[convId];
  if (!conv) return;
  update(d => { d.call = { id: uid('call'), convId, participants: [ME, ...conv.members.filter(m => m !== ME)], direction: 'in', state: { phase: 'ringing', since: Date.now() }, video: false, share: false }; });
  openModal({ kind: 'incomingCall', convId });
}
export function acceptCall() {
  update(d => { if (d.call && d.call.state.phase === 'ringing') d.call.state = { phase: 'connected', since: Date.now() }; });
  closeModal();
}
export function declineCall() {
  const c = get().call;
  if (!c) return;
  update(d => { d.calls.unshift({ id: c.id, convId: c.convId, participants: c.participants, video: false, direction: 'in', missed: true, startedAt: Date.now(), durationSec: 0 }); d.call = null; });
  closeModal();
  toast('Call declined', { tone: 'info' });
}
export function dismissEndedCall() { update(d => { if (d.call?.state.phase === 'ended') d.call = null; }); }
