import type { Story, UserId } from '@/types/models';

export interface AudienceCtx { friends: readonly UserId[]; closeOf: (owner: UserId) => readonly UserId[]; blocked: readonly UserId[]; now: number }

/** FLR-02: everyone / friends / close friends / custom, minus "hide from". Expired stories are excluded. */
export function canSee(story: Story, viewer: UserId, ctx: AudienceCtx): boolean {
  if (story.expiresAt <= ctx.now) return false;
  if (story.owner === viewer) return true;
  if (ctx.blocked.includes(story.owner) || story.hiddenFrom.includes(viewer)) return false;
  switch (story.audience) {
    case 'everyone': return true;
    case 'friends': return ctx.friends.includes(story.owner);
    case 'close': return ctx.closeOf(story.owner).includes(viewer);
    case 'custom': return story.customIds.includes(viewer);
  }
}
export function visibleStoriesFor(stories: readonly Story[], viewer: UserId, ctx: AudienceCtx): Story[] {
  return stories.filter(s => canSee(s, viewer, ctx)).sort((a, b) => a.createdAt - b.createdAt);
}
/** Who (among `people`) can see one of my stories. */
export function audiencePreview(story: Pick<Story, 'audience' | 'customIds' | 'hiddenFrom'>, people: readonly UserId[], friends: readonly UserId[], close: readonly UserId[]): UserId[] {
  return people.filter(p => {
    if (story.hiddenFrom.includes(p)) return false;
    if (story.audience === 'everyone') return true;
    if (story.audience === 'friends') return friends.includes(p);
    if (story.audience === 'close') return close.includes(p);
    return story.customIds.includes(p);
  });
}
