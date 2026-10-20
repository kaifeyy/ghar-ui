import { update, get } from '../store';
import type { NetState } from '@/types/models';
import { flushQueue } from './messages';

export function setNet(n: NetState) {
  const was = get().net;
  update(s => {
    s.net = n;
    if (s.voice && n !== 'online') s.voice = { phase: 'reconnecting', channelId: s.voice.channelId, since: Date.now() };
    if (s.voice && n === 'online' && s.voice.phase === 'reconnecting') s.voice = { phase: 'connected', channelId: s.voice.channelId, since: Date.now() };
  });
  if (n === 'online' && was !== 'online') flushQueue();
}
/** Simulated drop: offline → reconnecting → online. */
export function simulateDrop() {
  setNet('offline');
  setTimeout(() => setNet('reconnecting'), 2500);
  setTimeout(() => setNet('online'), 4500);
}
