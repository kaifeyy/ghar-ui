import { useShallow } from 'zustand/react/shallow';
import { useMemo, useState } from 'react';
import { Plus, MessagesSquare, Search } from 'lucide-react';
import type { Channel } from '@/types/models';
import { useApp } from '@/state/store';
import { openModal } from '@/state/actions/ui';
import { useT } from '@/i18n';
import { relTime } from '@/domain/time';
import { matchScore } from '@/domain/search';
import { Avatar } from '@/ui/Avatar';
import { Button } from '@/ui/Button';
import { Empty, Tag } from '@/ui/Misc';
import { RadioList, TextField } from '@/ui/Form';

export function ForumView({ channel: c }: { channel: Channel }) {
  const t = useT();
  const posts = useApp(useShallow(s => s.forum.filter(p => p.channelId === c.id)));
  const users = useApp(s => s.users);
  const now = useApp(s => s.now);
  const [tag, setTag] = useState<string>('all');
  const [sort, setSort] = useState<'recent' | 'replies'>('recent');
  const [q, setQ] = useState('');
  const tags = useMemo(() => [...new Set(posts.flatMap(p => p.tags))], [posts]);
  const list = posts
    .filter(p => tag === 'all' || p.tags.includes(tag))
    .filter(p => !q.trim() || matchScore(q, [p.title, p.body, ...p.tags]) > 0)
    .sort((a, b) => (sort === 'recent' ? b.at - a.at : b.replies.length - a.replies.length));
  return (
    <div className="scroll">
      <div className="page page-wide">
        <div className="row g12 wrap forum-bar">
          <TextField label={t('Search posts')} srLabel icon={Search} placeholder={t('Search posts')} value={q} onChange={e => setQ(e.target.value)} className="grow" />
          <RadioList name={`sort-${c.id}`} legend={t('Sort')} srLegend variant="segmented" value={sort} onChange={setSort} options={[{ value: 'recent', label: t('Newest') }, { value: 'replies', label: t('Most replies') }]} />
          <Button variant="primary" icon={Plus} onClick={() => openModal({ kind: 'newPost', channelId: c.id })}>{t('New post')}</Button>
        </div>
        {tags.length > 0 && (
          <RadioList name={`tag-${c.id}`} legend={t('Filter by tag')} srLegend variant="segmented" value={tag} onChange={setTag}
            options={[{ value: 'all', label: t('All') }, ...tags.map(x => ({ value: x, label: x }))]} />
        )}
        {list.length ? (
          <ul className="forum-list">
            {list.map(p => (
              <li key={p.id}>
                <button type="button" className="fpost" onClick={() => openModal({ kind: 'post', postId: p.id })}>
                  <Avatar userId={p.author} size={36} />
                  <span className="grow fpost-text">
                    <b dir="auto">{p.title}</b>
                    <span className="meta">{users[p.author]?.name} · {relTime(p.at, now)}</span>
                    <span className="row g4 wrap">{p.tags.map(x => <Tag key={x}>{x}</Tag>)}</span>
                  </span>
                  <span className="fpost-count"><MessagesSquare size={16} aria-hidden="true" /><span className="tnum">{p.replies.length}</span><span className="sr">{t('replies')}</span></span>
                </button>
              </li>
            ))}
          </ul>
        ) : <Empty icon={MessagesSquare} title={q || tag !== 'all' ? t('No posts match') : t('No posts yet')}>{t('Start the first post in this forum.')}</Empty>}
      </div>
    </div>
  );
}
