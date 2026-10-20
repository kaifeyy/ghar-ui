import { update, get } from '../store';
import type { Story, StoryAudience } from '@/types/models';
import { uid } from '@/domain/rng';
import { DAY } from '@/domain/time';
import { visibleStoriesFor } from '@/domain/stories';
import { ME } from '@/fixtures/users';
import { toast, ask } from './ui';
import { send } from './messages';
import { dmWith } from './social';
import { msg } from '@/i18n';

export function storyList(owner: string, highlightId?: string): Story[] {
  const s = get();
  if (highlightId) {
    const h = s.highlights.find(x => x.id === highlightId);
    return (h?.storyIds ?? []).map(id => s.stories.find(x => x.id === id)).filter((x): x is Story => !!x);
  }
  return visibleStoriesFor(s.stories, ME, { friends: s.friends, closeOf: o => (o === 'ayesha' || o === 'hamza' ? [ME] : []), blocked: s.blocked, now: Date.now() }).filter(x => x.owner === owner);
}

export function openStories(owner: string, highlightId?: string) {
  const list = storyList(owner, highlightId);
  if (!list.length) { toast('No stories to show', { tone: 'info' }); return; }
  update(s => { s.storyViewer = { owner, index: 0, ...(highlightId ? { highlightId } : {}) }; });
  markViewed(list[0]!.id);
}
export function storyStep(dir: 1 | -1) {
  const v = get().storyViewer;
  if (!v) return;
  const list = storyList(v.owner, v.highlightId);
  const next = v.index + dir;
  if (next < 0) return;
  if (next >= list.length) { closeStories(); return; }
  update(s => { if (s.storyViewer) s.storyViewer.index = next; });
  markViewed(list[next]!.id);
}
export function closeStories() { update(s => { s.storyViewer = null; }); }
function markViewed(id: string) { update(s => { const st = s.stories.find(x => x.id === id); if (st && st.owner !== ME && !st.viewers.some(v => v.userId === ME)) st.viewers.push({ userId: ME, at: Date.now() }); }); }
export function likeStory(id: string) { update(s => { const st = s.stories.find(x => x.id === id); if (!st) return; st.likedBy = st.likedBy.includes(ME) ? st.likedBy.filter(x => x !== ME) : [...st.likedBy, ME]; }); }
/** FLR-01: replies go to a DM. */
export function replyToStory(id: string, text: string) {
  const st = get().stories.find(x => x.id === id);
  if (!st || !text.trim()) return;
  const conv = dmWith(st.owner);
  send({ scope: 'dm', id: conv }, `↩ ${st.image.caption ? `“${st.image.caption}” ` : ''}${text.trim()}`);
  toast('Reply sent as a direct message');
}

export interface NewStory { url?: string; caption: string; audience: StoryAudience; customIds: string[]; hiddenFrom: string[] }
export function postStory(n: NewStory) {
  const id = uid('st');
  const now = Date.now();
  update(s => {
    s.stories.push({
      id, owner: ME, createdAt: now, expiresAt: now + DAY, audience: n.audience, customIds: n.customIds, hiddenFrom: n.hiddenFrom, viewers: [], likedBy: [],
      image: n.url ? { kind: 'local', url: n.url, caption: n.caption } : { kind: 'art', seed: id, color: '#3CCB91', caption: n.caption },
    });
  });
  toast('Story posted. It disappears after 24 hours.');
  return id;
}
export function updateAudience(id: string, audience: StoryAudience, customIds: string[], hiddenFrom: string[]) {
  update(s => { const st = s.stories.find(x => x.id === id && x.owner === ME); if (st) { st.audience = audience; st.customIds = customIds; st.hiddenFrom = hiddenFrom; } });
  toast('Story audience updated');
}
export function deleteStory(id: string) {
  ask({ title: msg('Delete this story?'), body: msg('It’s removed for everyone, including from your highlights.'), confirmLabel: msg('Delete story'), tone: 'danger', onConfirm: () => {
    update(s => { s.stories = s.stories.filter(x => x.id !== id); s.highlights.forEach(h => { h.storyIds = h.storyIds.filter(x => x !== id); }); s.highlights = s.highlights.filter(h => h.storyIds.length > 0); s.storyViewer = null; });
    toast('Story deleted');
  } });
}
/** FLR-03: save into a named highlight (existing or new). */
export function addToHighlight(storyId: string, highlight: { id?: string; name?: string }) {
  let label = '';
  update(s => {
    let h = highlight.id ? s.highlights.find(x => x.id === highlight.id) : undefined;
    if (!h) { h = { id: uid('hl'), owner: ME, name: (highlight.name ?? '').trim() || 'Highlights', storyIds: [] }; s.highlights.push(h); }
    if (!h.storyIds.includes(storyId)) h.storyIds.push(storyId);
    label = h.name;
  });
  toast('Saved to “{name}”', { vars: { name: label } });
}
export function renameHighlight(id: string, name: string) { update(s => { const h = s.highlights.find(x => x.id === id); if (h && name.trim()) h.name = name.trim(); }); }
export function deleteHighlight(id: string) {
  ask({ title: msg('Delete this highlight?'), body: msg('The stories stay deleted or expired as before; only the highlight is removed.'), confirmLabel: msg('Delete highlight'), tone: 'danger', onConfirm: () => { update(s => { s.highlights = s.highlights.filter(h => h.id !== id); }); toast('Highlight deleted'); } });
}
