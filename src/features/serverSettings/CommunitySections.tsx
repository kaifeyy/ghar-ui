import { useMemo, useState, type DragEvent } from 'react';
import { ColorField } from '@/ui/Pickers';
import { useShallow } from 'zustand/react/shallow';
import { Plus, ArrowUp, ArrowDown, Pencil, Trash2, GripVertical, Copy, Link2, AlertTriangle, Check, Lock, Gavel, Clock, Ban, MessageSquareX, ShieldAlert, Search, CalendarDays, Megaphone, LifeBuoy } from 'lucide-react';
import { useApp, update } from '@/state/store';
import { myTopPosition } from '@/state/selectors';
import { openModal, toast, ask, go } from '@/state/actions/ui';
import { saveOverview, saveRole, newRoleDraft, deleteRole, moveRole, addRoleCategory, renameRoleCategory, setMemberRole, moveChannel, moveCategory, createCategory, renameCategory, deleteCategory, renameEmoji, deleteEmoji, createInvite, revokeInvite, cancelEvent } from '@/state/actions/community';
import { moderate } from '@/state/actions/portal';
import { useT, useLocale, msg, type Key } from '@/i18n';
import type { BannerStyle, CommunityCategory, Permission, Role } from '@/types/models';
import { contrast, ratioLabel } from '@/domain/contrast';
import { matchScore } from '@/domain/search';
import { formatKarachi, relTime } from '@/domain/time';
import { fmt, kfmt } from '@/domain/format';
import { useDraft } from '@/hooks/useDraft';
import { Button, IconButton } from '@/ui/Button';
import { Empty, Note, Section, Stat, Tag, DemoTag } from '@/ui/Misc';
import { Checkbox, RadioList, Select, TextArea, TextField, Toggle } from '@/ui/Form';
import { SaveBar } from '@/ui/SaveBar';
import { Art } from '@/ui/Art';
import { Avatar } from '@/ui/Avatar';
import { ChannelGlyph } from '@/shell/Sidebar';
import { LEVELS, levelFor, emojiSlots, DONATION_LEVEL, BRIDGE_LEVEL } from '@/fixtures/communities';
import { analyticsSeries } from '@/fixtures/portal';
import { ME } from '@/fixtures/users';

const CATS: CommunityCategory[] = ['Gaming', 'Study', 'Jobs', 'Local cities', 'Islamic', 'Fun'];
const BANNERS: BannerStyle[] = ['auto', 'study', 'gaming', 'jobs', 'fun', 'islamic', 'cities'];
export const PERM_LABEL: Record<Permission, Key> = {
  manageServer: msg('Manage community'), manageRoles: msg('Manage roles'), manageChannels: msg('Manage channels'), manageDeveloperPortal: msg('Manage Developer Portal'), kick: msg('Kick members'), ban: msg('Ban members'),
  timeout: msg('Time out members'), manageMessages: msg('Manage messages'), mentionEveryone: msg('Mention @everyone'), sendMessages: msg('Send messages'), speak: msg('Speak in voice'), stream: msg('Stream camera and screen'), viewAudit: msg('View audit log'),
};

/* ---------------- overview & theme (COM-11) ---------------- */
export function OverviewSection({ serverId }: { serverId: string }) {
  const t = useT();
  const sv = useApp(s => s.servers[serverId]!);
  const saved = { name: sv.name, description: sv.description, city: sv.city, category: sv.category, bannerStyle: sv.bannerStyle, accent: sv.accent ?? sv.color, effectsEnabled: sv.effectsEnabled, whisperEnabled: sv.whisperEnabled, e2ee: !!sv.e2ee };
  const { draft: d, patch, dirty, reset } = useDraft(saved);
  const ratioDark = contrast(d.accent, '#18191C'), ratioLight = contrast(d.accent, '#FFFFFF');
  const accentOk = Math.max(ratioDark, ratioLight) >= 3 && Math.min(ratioDark, ratioLight) >= 1.4;
  const nameErr = d.name.trim().length < 2 ? t('Use 2–40 characters.') : null;
  const save = () => { if (nameErr || !accentOk) return false; saveOverview(serverId, { ...d, name: d.name.trim() }); toast('Community settings saved'); return true; };
  return (
    <div className="ss-page">
      <Section title={t('Profile')}>
        <TextField label={t('Name')} value={d.name} onChange={e => patch({ name: e.target.value })} error={nameErr} maxLength={40} />
        <TextArea label={t('Description')} value={d.description} onChange={e => patch({ description: e.target.value })} maxLength={300} count={d.description.length} />
        <div className="row g12 wrap">
          <Select label={t('Category')} value={d.category} onValue={v => patch({ category: v })} options={CATS.map(c => [c, c] as const)} className="grow" hint={t('Controls where the community appears in Discover.')} />
          <TextField label={t('City')} value={d.city} onChange={e => patch({ city: e.target.value })} className="grow" />
        </div>
      </Section>
      <Section title={t('Theme')} description={t('Banner style and colours only change how the community looks. They never change its category.')}>
        <div className="theme-preview"><Art seed={sv.id + 'b'} color={d.accent} style={d.bannerStyle} w={600} h={140} /></div>
        <RadioList name="ss-banner" legend={t('Banner style')} variant="segmented" value={d.bannerStyle} onChange={v => patch({ bannerStyle: v })} options={BANNERS.map(b => ({ value: b, label: t(({ auto: msg('Auto'), study: msg('Study'), gaming: msg('Gaming'), jobs: msg('Jobs'), fun: msg('Fun'), islamic: msg('Islamic'), cities: msg('Cities') } as const)[b]) }))} />
        <div className="col g8">
          <ColorField label={t('Accent colour')} value={d.accent} onChange={v => patch({ accent: v })} />
          <p className={`small row g8 ${accentOk ? 'ok' : 'warn'}`} role="status">{accentOk ? <Check size={16} aria-hidden="true" /> : <AlertTriangle size={16} aria-hidden="true" />}{t('Contrast: {a} on dark, {b} on light', { a: ratioLabel(ratioDark), b: ratioLabel(ratioLight) })}{accentOk ? '' : ' · ' + t('Choose a colour readable on both themes (at least 3:1 on one).')}</p>
        </div>
      </Section>
      <Section title={t('Features')}>
        <div className="list-rows">
          <Toggle label={t('Entrance effects')} description={t('Let members’ entrance animations play here.')} checked={d.effectsEnabled} onChange={v => patch({ effectsEnabled: v })} />
          <Toggle label={t('Whisper in voice')} description={t('Members can whisper to one person in a voice channel.')} checked={d.whisperEnabled} onChange={v => patch({ whisperEnabled: v })} />
          {sv.kind === 'room' && <Toggle label={t('End-to-end encryption')} description={t('Turns off auto-moderation, search and content logs, and says so clearly to members. Label only in this demo.')} checked={d.e2ee} onChange={v => patch({ e2ee: v })} />}
        </div>
      </Section>
      <SaveBar dirty={dirty} onSave={save} onDiscard={reset} disabled={!!nameErr || !accentOk} />
    </div>
  );
}

/* ---------------- roles (COM-06/07/08) ---------------- */
export function RolesSection({ serverId }: { serverId: string }) {
  const t = useT();
  const sv = useApp(s => s.servers[serverId]!);
  const top = useApp(s => myTopPosition(s, serverId));
  const owner = sv.owner === ME;
  const roles = [...sv.roles].sort((a, b) => a.position - b.position);
  const [sel, setSel] = useState<string>(roles.find(r => !r.system)?.id ?? '');
  const [draft, setDraft] = useState<Role | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [newCat, setNewCat] = useState('');
  const editing = draft ?? roles.find(r => r.id === sel) ?? null;
  const locked = (r: Role) => !!r.system || (!owner && r.position <= top);
  const pick = (id: string) => { setSel(id); setDraft(null); setErr(null); };
  const change = (p: Partial<Role>) => editing && setDraft({ ...editing, ...p });
  const save = () => { if (!draft) return; const e = saveRole(serverId, draft); if (e) setErr(e === 'hierarchy' ? t('You can only edit roles below your highest role.') : t('Give the role a name.')); else { setSel(draft.id); setDraft(null); setErr(null); } };
  const style = (r: Role) => (r.color2 ? { backgroundImage: `linear-gradient(90deg, ${r.color1}, ${r.color2})`, WebkitBackgroundClip: 'text' as const, backgroundClip: 'text' as const, color: 'transparent' } : { color: r.color1 });
  return (
    <div className="ss-page ss-roles">
      <div className="roles-list">
        <div className="row between"><h3 className="label">{t('Roles by rank')}</h3><Button size="sm" icon={Plus} onClick={() => { const r = newRoleDraft(serverId); setDraft(r); setSel(r.id); }}>{t('New role')}</Button></div>
        <ol className="col g4">{roles.map((r, i) => (
          <li key={r.id} className={`role-row ${sel === r.id ? 'is-on' : ''}`}>
            <button type="button" className="grow role-pick" onClick={() => pick(r.id)} aria-current={sel === r.id}>
              <span className="role-dot" style={{ background: r.color2 ? `linear-gradient(90deg, ${r.color1}, ${r.color2})` : r.color1 }} aria-hidden="true" />
              <b style={style(r)}>{r.name}</b>
              <span className="meta">{sv.roleCategories.find(c => c.id === r.categoryId)?.name}</span>
              {locked(r) && <Lock size={12} aria-label={t('Locked')} />}
            </button>
            {!r.system && <>
              <IconButton icon={ArrowUp} size="sm" label={t('Move {name} up', { name: r.name })} disabled={locked(r) || i === 0 || !!roles[i - 1]?.system || (!owner && (roles[i - 1]?.position ?? 0) <= top)} onClick={() => moveRole(serverId, r.id, -1)} />
              <IconButton icon={ArrowDown} size="sm" label={t('Move {name} down', { name: r.name })} disabled={locked(r) || !!roles[i + 1]?.system} onClick={() => moveRole(serverId, r.id, 1)} />
            </>}
          </li>
        ))}</ol>
        <p className="meta">{t('Higher roles outrank lower ones. You can’t edit or assign roles at or above your own.')}</p>
        <h3 className="label mt16">{t('Role categories')}</h3>
        <ul className="col g4">{sv.roleCategories.map(c => <li key={c.id}><TextField label={t('Category name')} srLabel value={c.name} onChange={e => renameRoleCategory(serverId, c.id, e.target.value)} /></li>)}</ul>
        <form className="row g8" onSubmit={e => { e.preventDefault(); if (newCat.trim()) { addRoleCategory(serverId, newCat); setNewCat(''); } }}><TextField label={t('New category')} srLabel placeholder={t('New category')} value={newCat} onChange={e => setNewCat(e.target.value)} className="grow" /><Button type="submit" icon={Plus} disabled={!newCat.trim()}>{t('Add')}</Button></form>
      </div>
      <div className="role-edit">
        {editing ? (
          <>
            <div className="row g8"><h3 className="sec-title grow" style={style(editing)}>{editing.name || t('New role')}</h3>{draft && <Tag tone="amber">{t('Unsaved')}</Tag>}</div>
            {locked(editing) && <Note tone="info">{editing.system ? t('Built-in roles can’t be edited.') : t('This role is at or above your highest role.')}</Note>}
            <fieldset disabled={locked(editing)} className="col g16">
              <TextField label={t('Role name')} value={editing.name} onChange={e => change({ name: e.target.value })} maxLength={32} />
              <Select label={t('Category')} value={editing.categoryId} onValue={v => change({ categoryId: v })} options={sv.roleCategories.map(c => [c.id, c.name] as const)} />
              <div className="col g12">
                <ColorField label={t('Colour')} value={editing.color1} onChange={v => change({ color1: v })} />
                <Checkbox label={t('Two-colour gradient')} checked={!!editing.color2} onChange={v => change({ color2: v ? '#A78BFA' : undefined })} />
                {editing.color2 && <ColorField label={t('Second colour')} value={editing.color2} onChange={v => change({ color2: v })} />}
                <span className="role-preview">{t('Preview:')} <b style={style(editing)}>{editing.name || t('Role name')}</b></span>
              </div>
              <p className="meta">{t('Name contrast on dark: {r}', { r: ratioLabel(Math.min(contrast(editing.color1, '#18191C'), editing.color2 ? contrast(editing.color2, '#18191C') : 99)) })}</p>
              <fieldset className="perm-grid"><legend className="flabel">{t('Permissions')}</legend>
                {(Object.keys(PERM_LABEL) as Permission[]).map(p => <Checkbox key={p} label={t(PERM_LABEL[p])} checked={editing.permissions.includes(p)} onChange={v => change({ permissions: v ? [...editing.permissions, p] : editing.permissions.filter(x => x !== p) })} />)}
              </fieldset>
            </fieldset>
            {err && <p className="ferr" role="alert">{err}</p>}
            <div className="row g8">
              {!editing.system && sv.roles.some(r => r.id === editing.id) && <Button variant="danger-ghost" icon={Trash2} onClick={() => deleteRole(serverId, editing.id)} disabled={locked(editing)}>{t('Delete role')}</Button>}
              <span className="grow" />
              <Button onClick={() => { setDraft(null); setErr(null); }} disabled={!draft}>{t('Discard')}</Button>
              <Button variant="primary" onClick={save} disabled={!draft || locked(editing)}>{t('Save role')}</Button>
            </div>
          </>
        ) : <Empty icon={Lock} title={t('Choose a role')} />}
      </div>
    </div>
  );
}

/* ---------------- channels & categories: drag to reorder, with keyboard alternatives ---------------- */
export function ChannelsSection({ serverId }: { serverId: string }) {
  const t = useT();
  const sv = useApp(s => s.servers[serverId]!);
  const channels = useApp(s => s.channels);
  const [drag, setDrag] = useState<{ kind: 'ch' | 'cat'; id: string } | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [newCat, setNewCat] = useState('');
  const [status, setStatus] = useState('');
  const onDrop = (e: DragEvent, catId: string, index: number) => {
    e.preventDefault(); setOver(null);
    if (!drag) return;
    if (drag.kind === 'ch') { moveChannel(serverId, drag.id, catId, index); setStatus(t('Moved #{name}', { name: channels[drag.id]?.name ?? '' })); }
    setDrag(null);
  };
  const keyMove = (chId: string, catIdx: number, idx: number, dir: -1 | 1) => {
    const cat = sv.categories[catIdx]!;
    const ni = idx + dir;
    if (ni >= 0 && ni < cat.channelIds.length) moveChannel(serverId, chId, cat.id, ni);
    else { const nc = sv.categories[catIdx + dir]; if (nc) moveChannel(serverId, chId, nc.id, dir === 1 ? 0 : nc.channelIds.length); }
    setStatus(t('Moved #{name}', { name: channels[chId]?.name ?? '' }));
    requestAnimationFrame(() => document.getElementById(`mv-${chId}-${dir > 0 ? 'down' : 'up'}`)?.focus());
  };
  return (
    <div className="ss-page">
      <Note>{t('Drag channels to reorder them, or use the arrow buttons. Channel types: text, voice, stage, forum and announcement.')}</Note>
      <p className="sr" aria-live="polite">{status}</p>
      <ol className="cat-list">{sv.categories.map((cat, ci) => (
        <li key={cat.id} className={`cat-block ${over === 'cat-' + cat.id ? 'is-over' : ''}`} draggable onDragStart={e => { e.stopPropagation(); setDrag({ kind: 'cat', id: cat.id }); }}
          onDragOver={e => { if (drag?.kind === 'cat') { e.preventDefault(); setOver('cat-' + cat.id); } }} onDrop={e => { if (drag?.kind === 'cat') { e.preventDefault(); moveCategory(serverId, drag.id, ci); setDrag(null); setOver(null); } }}>
          <div className="cat-head">
            <GripVertical size={16} aria-hidden="true" className="mut grip" />
            <TextField label={t('Category name')} srLabel value={cat.name} onChange={e => renameCategory(serverId, cat.id, e.target.value)} className="grow" />
            <IconButton icon={ArrowUp} size="sm" label={t('Move category {name} up', { name: cat.name })} disabled={ci === 0} onClick={() => moveCategory(serverId, cat.id, ci - 1)} />
            <IconButton icon={ArrowDown} size="sm" label={t('Move category {name} down', { name: cat.name })} disabled={ci === sv.categories.length - 1} onClick={() => moveCategory(serverId, cat.id, ci + 1)} />
            <IconButton icon={Plus} size="sm" label={t('Create channel in {cat}', { cat: cat.name })} onClick={() => openModal({ kind: 'createChannel', serverId, categoryId: cat.id })} />
            <IconButton icon={Trash2} size="sm" label={t('Delete category {name}', { name: cat.name })} onClick={() => deleteCategory(serverId, cat.id)} />
          </div>
          <ol className="ch-list" onDragOver={e => { if (drag?.kind === 'ch') { e.preventDefault(); setOver(cat.id + ':end'); } }} onDrop={e => onDrop(e, cat.id, cat.channelIds.length)}>
            {cat.channelIds.map((id, i) => { const c = channels[id]; if (!c) return null; return (
              <li key={id} className={`ch-row ${over === cat.id + ':' + i ? 'is-over' : ''}`} draggable onDragStart={e => { e.stopPropagation(); setDrag({ kind: 'ch', id }); e.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => { setDrag(null); setOver(null); }}
                onDragOver={e => { if (drag?.kind === 'ch') { e.preventDefault(); e.stopPropagation(); setOver(cat.id + ':' + i); } }} onDrop={e => { e.stopPropagation(); onDrop(e, cat.id, i); }}>
                <GripVertical size={16} aria-hidden="true" className="mut grip" />
                <span className="nav-icon" aria-hidden="true"><ChannelGlyph channel={c} /></span>
                <span className="grow ellip">{c.name}</span>
                {c.lock && <Tag tone="outline" icon={Lock}>{c.lock.kind === 'payment' ? `Rs ${c.lock.pricePkr}` : c.lock.kind === 'role' ? t('Role') : t('Password')}</Tag>}
                <IconButton id={`mv-${id}-up`} icon={ArrowUp} size="sm" label={t('Move #{name} up', { name: c.name })} disabled={ci === 0 && i === 0} onClick={() => keyMove(id, ci, i, -1)} />
                <IconButton id={`mv-${id}-down`} icon={ArrowDown} size="sm" label={t('Move #{name} down', { name: c.name })} disabled={ci === sv.categories.length - 1 && i === cat.channelIds.length - 1} onClick={() => keyMove(id, ci, i, 1)} />
                <IconButton icon={Pencil} size="sm" label={t('Edit #{name}', { name: c.name })} onClick={() => openModal({ kind: 'editChannel', channelId: id })} />
              </li>
            ); })}
            {!cat.channelIds.length && <li className="meta ch-empty">{t('Drop channels here')}</li>}
          </ol>
        </li>
      ))}</ol>
      <form className="row g8" onSubmit={e => { e.preventDefault(); if (newCat.trim()) { createCategory(serverId, newCat); setNewCat(''); } }}>
        <TextField label={t('New category')} srLabel placeholder={t('New category')} value={newCat} onChange={e => setNewCat(e.target.value)} className="grow" /><Button type="submit" icon={Plus} disabled={!newCat.trim()}>{t('Add category')}</Button>
      </form>
    </div>
  );
}

/* ---------------- members, role assignment, moderation (COM-09, DPT-05) ---------------- */
export function MembersSection({ serverId }: { serverId: string }) {
  const t = useT();
  const locale = useLocale();
  const sv = useApp(s => s.servers[serverId]!);
  const users = useApp(s => s.users);
  const cases = useApp(useShallow(s => s.modCases.filter(c => c.serverId === serverId)));
  const bans = useApp(s => s.serverBans[serverId]) ?? [];
  const top = useApp(s => myTopPosition(s, serverId));
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const list = sv.memberList.filter(m => !q.trim() || matchScore(q, [users[m.userId]?.name ?? '', users[m.userId]?.handle ?? '']) > 0);
  const assignable = sv.roles.filter(r => !r.system && (sv.owner === ME || r.position > top));
  return (
    <div className="ss-page">
      <TextField label={t('Search members')} srLabel icon={Search} placeholder={t('Search members')} value={q} onChange={e => setQ(e.target.value)} />
      <ul className="flist">{list.map(m => {
        const u = users[m.userId];
        const mine = cases.filter(c => c.memberId === m.userId);
        const timed = m.timeoutUntil && m.timeoutUntil > Date.now();
        return (
          <li key={m.userId} className="member-row">
            <div className="frow">
              <div className="frow-main"><Avatar userId={m.userId} size={36} /><span className="person-text"><b>{u?.name}</b><em>{sv.roles.filter(r => m.roleIds.includes(r.id)).map(r => r.name).join(' · ') || t('No roles')}</em></span></div>
              {timed && <Tag tone="amber" icon={Clock}>{t('Timed out')}</Tag>}
              {m.warnings > 0 && <Tag tone="outline">{t('{n} warnings', { n: m.warnings })}</Tag>}
              <Button size="sm" aria-expanded={open === m.userId} onClick={() => setOpen(o => (o === m.userId ? null : m.userId))}>{open === m.userId ? t('Close') : t('Manage')}</Button>
            </div>
            {open === m.userId && (
              <div className="member-panel">
                <fieldset className="col g4"><legend className="flabel">{t('Roles')}</legend>
                  {assignable.map(r => <Checkbox key={r.id} label={r.name} checked={m.roleIds.includes(r.id)} onChange={v => setMemberRole(serverId, m.userId, r.id, v)} />)}
                </fieldset>
                {m.userId !== ME && m.userId !== sv.owner && (
                  <div className="row g8 wrap">
                    <Button size="sm" icon={ShieldAlert} onClick={() => openModal({ kind: 'moderate', serverId, userId: m.userId, action: 'warn' })}>{t('Warn')}</Button>
                    {timed ? <Button size="sm" icon={Clock} onClick={() => moderate(serverId, m.userId, 'untimeout', 'Lifted')}>{t('Remove timeout')}</Button> : <Button size="sm" icon={Clock} onClick={() => openModal({ kind: 'moderate', serverId, userId: m.userId, action: 'timeout' })}>{t('Time out')}</Button>}
                    <Button size="sm" icon={MessageSquareX} onClick={() => openModal({ kind: 'moderate', serverId, userId: m.userId, action: 'remove-messages' })}>{t('Remove messages')}</Button>
                    <Button size="sm" variant="danger-ghost" onClick={() => openModal({ kind: 'moderate', serverId, userId: m.userId, action: 'kick' })}>{t('Kick')}</Button>
                    <Button size="sm" variant="danger-ghost" icon={Ban} onClick={() => openModal({ kind: 'moderate', serverId, userId: m.userId, action: 'ban' })}>{t('Ban')}</Button>
                  </div>
                )}
                <h4 className="label">{t('Case history')}</h4>
                {mine.length ? <ul className="col g4">{mine.map(c => <li key={c.id} className="small"><Gavel size={14} aria-hidden="true" /> {c.action}{c.detail ? ` (${c.detail})` : ''} · {c.reason} · <span className="meta">{users[c.by]?.name} · {formatKarachi(c.at, { dateStyle: 'medium' }, locale)}</span></li>)}</ul> : <p className="meta">{t('No cases.')}</p>}
              </div>
            )}
          </li>
        );
      })}</ul>
      <Section title={t('Bans')}>
        {bans.length ? <ul className="flist">{bans.map(b => <li key={b.userId} className="frow"><div className="frow-main"><Ban size={18} aria-hidden="true" /><span className="person-text"><b>{b.label}</b><em>{b.reason} · {relTime(b.at, Date.now())}</em></span></div><Button size="sm" onClick={() => moderate(serverId, b.userId, 'unban', 'Unbanned')}>{t('Unban')}</Button></li>)}</ul> : <p className="meta">{t('No bans.')}</p>}
      </Section>
    </div>
  );
}

/* ---------------- emoji & stickers (MSG-04) ---------------- */
export function EmojiSection({ serverId }: { serverId: string }) {
  const t = useT();
  const sv = useApp(s => s.servers[serverId]!);
  const users = useApp(s => s.users);
  const block = (type: 'emoji' | 'sticker') => {
    const list = type === 'emoji' ? sv.emoji : sv.stickers;
    const slots = type === 'emoji' ? emojiSlots(sv.xp) : 10;
    return (
      <Section title={type === 'emoji' ? t('Emoji') : t('Stickers')} description={t('{used} of {slots} slots used', { used: list.length, slots })} actions={<Button size="sm" icon={Plus} onClick={() => openModal({ kind: 'emojiUpload', serverId, type })} disabled={list.length >= slots}>{t('Add')}</Button>}>
        {list.length ? <ul className="emoji-list">{list.map(e => (
          <li key={e.id} className="emoji-row">
            <span className="emoji-big" aria-hidden="true">{e.art.kind === 'glyph' ? e.art.glyph : <img src={e.art.url} alt="" />}</span>
            <TextField label={t('Name')} srLabel prefix=":" value={e.name} onChange={ev => renameEmoji(serverId, type, e.id, ev.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} className="grow" />
            <span className="meta">{users[e.by]?.name}</span>
            <IconButton icon={Trash2} size="sm" label={t('Delete :{name}:', { name: e.name })} onClick={() => deleteEmoji(serverId, type, e.id)} />
          </li>
        ))}</ul> : <p className="meta">{t('None yet.')}</p>}
      </Section>
    );
  };
  return <div className="ss-page">{block('emoji')}{block('sticker')}<p className="meta">{t('Platform emoji and sticker packs are always available too.')}</p></div>;
}

/* ---------------- invites ---------------- */
export function InvitesSection() {
  const t = useT();
  const locale = useLocale();
  const invites = useApp(s => s.invites);
  const users = useApp(s => s.users);
  const [uses, setUses] = useState('0');
  const [days, setDays] = useState('7');
  const copy = (code: string) => { const url = `https://ghar.example/invite/${code}`; navigator.clipboard?.writeText(url).then(() => toast('Invite link copied'), () => toast('Couldn’t copy. Select the link instead.', { tone: 'warn' })); };
  return (
    <div className="ss-page">
      <Section title={t('Create invite')}>
        <div className="row g12 wrap end-row">
          <Select label={t('Max uses')} value={uses} onValue={setUses} options={[['0', t('No limit')], ['10', '10'], ['50', '50'], ['100', '100']]} />
          <Select label={t('Expires')} value={days} onValue={setDays} options={[['1', t('1 day')], ['7', t('7 days')], ['0', t('Never')]]} />
          <Button variant="primary" icon={Link2} onClick={() => createInvite(Number(uses) || null, Number(days) || null)}>{t('Create link')}</Button>
        </div>
      </Section>
      <Section title={t('Active invites')}>
        <ul className="flist">{invites.map(i => (
          <li key={i.code} className="frow">
            <div className="frow-main"><Link2 size={18} aria-hidden="true" /><span className="person-text"><b className="ltr">ghar.example/invite/{i.code}</b><em>{t('by {name}', { name: users[i.by]?.name ?? i.by })} · {t('{n} uses', { n: i.uses })}{i.maxUses ? ` / ${i.maxUses}` : ''} · {i.expiresAt ? t('expires {date}', { date: formatKarachi(i.expiresAt, { dateStyle: 'medium' }, locale) }) : t('never expires')}</em></span></div>
            <IconButton icon={Copy} size="sm" label={t('Copy link')} onClick={() => copy(i.code)} />
            <IconButton icon={Trash2} size="sm" label={t('Revoke')} onClick={() => revokeInvite(i.code)} />
          </li>
        ))}</ul>
      </Section>
    </div>
  );
}

export function EventsAdminSection({ serverId }: { serverId: string }) {
  const t = useT();
  const locale = useLocale();
  const events = useApp(useShallow(s => s.events.filter(e => e.serverId === serverId)));
  return (
    <div className="ss-page">
      <div className="row g8"><Button variant="primary" icon={Plus} onClick={() => openModal({ kind: 'createEvent', serverId })}>{t('Create event')}</Button><Button icon={CalendarDays} onClick={() => go({ name: 'events', serverId })}>{t('View events page')}</Button></div>
      {events.length ? <ul className="flist">{events.map(e => <li key={e.id} className="frow"><div className="frow-main"><CalendarDays size={18} aria-hidden="true" /><span className="person-text"><b>{e.name}</b><em>{formatKarachi(e.startsAt, { dateStyle: 'medium', timeStyle: 'short' }, locale)} · {t('{a} going · {b} interested', { a: e.going, b: e.interested })}</em></span></div><Button size="sm" onClick={() => openModal({ kind: 'event', eventId: e.id })}>{t('Open')}</Button><Button size="sm" variant="danger-ghost" onClick={() => cancelEvent(e.id)}>{t('Cancel')}</Button></li>)}</ul> : <Empty icon={CalendarDays} title={t('No events yet')} />}
    </div>
  );
}

/* ---------------- levels & perks (COM-12) ---------------- */
export function LevelsSection({ serverId }: { serverId: string }) {
  const t = useT();
  const sv = useApp(s => s.servers[serverId]!);
  const cur = levelFor(sv.xp);
  const next = LEVELS.find(l => l.xp > sv.xp);
  const pct = next ? Math.round(((sv.xp - cur.xp) / (next.xp - cur.xp)) * 100) : 100;
  return (
    <div className="ss-page">
      <div className="stats3">
        <Stat label={t('Level')} value={String(cur.level)} />
        <Stat label={t('Community XP')} value={fmt(sv.xp)} sub={next ? t('{n} XP to level {l}', { n: fmt(next.xp - sv.xp), l: next.level }) : t('Top level')} />
        <Stat label={t('Donations')} value={cur.level >= DONATION_LEVEL && sv.kind === 'server' ? t('Open') : t('Locked')} sub={t('Unlock at level {n}', { n: DONATION_LEVEL })} />
      </div>
      <div className="capbar"><div className="capbar-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={t('Progress to next level')}><span style={{ width: pct + '%' }} /></div><span className="tnum small">{pct}%</span></div>
      <p className="meta">{t('XP comes from member activity and donations. Sample thresholds.')}</p>
      <ol className="levels">{LEVELS.map(l => (
        <li key={l.level} className={`level ${sv.xp >= l.xp ? 'is-on' : ''}`}>
          <b>{t('Level {n}', { n: l.level })}</b><span className="meta">{t('{n} XP', { n: fmt(l.xp) })}</span>
          <ul>{l.perks.map(p => <li key={p} className="row g8">{sv.xp >= l.xp ? <Check size={14} aria-hidden="true" className="ok" /> : <Lock size={14} aria-hidden="true" className="mut" />}{p}</li>)}</ul>
        </li>
      ))}</ol>
      {sv.kind === 'room' && <Note tone="info">{t('Rooms can’t take donations or sponsorships until they’re approved as a server.')}</Note>}
    </div>
  );
}

/* ---------------- owner engagement (DIS-03) ---------------- */
export function AnalyticsSection({ serverId }: { serverId: string }) {
  const t = useT();
  const locale = useLocale();
  const sv = useApp(s => s.servers[serverId]!);
  const activity = useApp(s => s.activity);
  const series = useMemo(() => analyticsSeries(serverId), [serverId]);
  const max = Math.max(...series.map(d => d.messages));
  const topPeople = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of activity) if (a.serverId === serverId) m.set(a.userId, (m.get(a.userId) ?? 0) + a.messages);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [activity, serverId]);
  const users = useApp(s => s.users);
  const totals = series.reduce((o, d) => ({ m: o.m + d.messages, v: o.v + d.voiceHours, j: o.j + d.joins, l: o.l + d.leaves }), { m: 0, v: 0, j: 0, l: 0 });
  return (
    <div className="ss-page">
      <div className="stats3">
        <Stat label={t('Members')} value={kfmt(sv.members)} sub={t('{n} online now', { n: fmt(sv.online) })} />
        <Stat label={t('Messages · 14 days')} value={fmt(totals.m)} />
        <Stat label={t('Voice hours · 14 days')} value={fmt(totals.v)} />
        <Stat label={t('Net growth · 14 days')} value={`${totals.j - totals.l >= 0 ? '+' : ''}${totals.j - totals.l}`} sub={t('{a} joined, {b} left', { a: totals.j, b: totals.l })} tone={totals.j >= totals.l ? 'ok' : 'bad'} />
      </div>
      <Section title={t('Messages per day')}>
        <figure className="bars" aria-label={t('Messages per day for the last 14 days')}>
          {series.map(d => <div key={d.day} className="bar" title={`${formatKarachi(d.day, { day: 'numeric', month: 'short' }, locale)}: ${d.messages}`}><span style={{ height: `${(d.messages / max) * 100}%` }} /><em>{formatKarachi(d.day, { day: 'numeric' }, locale)}</em></div>)}
        </figure>
        <table className="sr"><caption>{t('Messages per day')}</caption><tbody>{series.map(d => <tr key={d.day}><th>{formatKarachi(d.day, { day: 'numeric', month: 'short' }, locale)}</th><td>{d.messages}</td></tr>)}</tbody></table>
      </Section>
      <Section title={t('Most active members')}>
        <ol className="supporters">{topPeople.map(([id, n], i) => <li key={id}><span className="rank tnum">{i + 1}</span><Avatar userId={id} size={28} /><span className="grow">{users[id]?.name}</span><b className="tnum">{fmt(n)}</b></li>)}</ol>
      </Section>
      <DemoTag>{t('Sample analytics')}</DemoTag>
    </div>
  );
}

/* ---------------- bridge (COM-13) ---------------- */
export function BridgeSection({ serverId }: { serverId: string }) {
  const t = useT();
  const sv = useApp(s => s.servers[serverId]!);
  const bridges = useApp(s => s.bridges);
  const channels = useApp(s => s.channels);
  const eligible = levelFor(sv.xp).level >= BRIDGE_LEVEL && sv.kind === 'server';
  const accept = (id: string) => update(d => { const b = d.bridges.find(x => x.id === id); if (!b) return; b.state = 'active'; const c = d.channels[b.fromChannel]; if (c) c.bridge = { serverId: 'lg', channelId: b.toChannel, serverName: b.toServer }; d.messages[b.fromChannel]?.push({ id: 'br' + Date.now(), author: 'hamza', text: 'Bridged message test from Lahore Gamers', at: Date.now(), attachments: [], reactions: {}, delivery: 'sent', origin: b.toServer }); });
  const unlink = (id: string) => ask({ title: msg('Unlink this bridge?'), body: msg('Messages stop mirroring. Each side keeps its own copies.'), confirmLabel: msg('Unlink'), tone: 'danger', onConfirm: () => { update(d => { const b = d.bridges.find(x => x.id === id); if (b) { const c = d.channels[b.fromChannel]; if (c) delete c.bridge; } d.bridges = d.bridges.filter(x => x.id !== id); }); toast('Bridge unlinked'); } });
  return (
    <div className="ss-page">
      <Note>{t('A bridge mirrors one channel with a channel in another community. Both must be level {n} and both owners approve. Messages show where they came from; each side moderates its own copy.', { n: BRIDGE_LEVEL })}</Note>
      <Button variant="primary" icon={Plus} disabled={!eligible} onClick={() => openModal({ kind: 'bridgeRequest', serverId })}>{t('Request a bridge')}</Button>
      {!eligible && <p className="meta">{t('Reach level {n} to request bridges.', { n: BRIDGE_LEVEL })}</p>}
      <ul className="flist">{bridges.map(b => (
        <li key={b.id} className="frow">
          <div className="frow-main"><Link2 size={18} aria-hidden="true" /><span className="person-text"><b>#{channels[b.fromChannel]?.name} ↔ {b.toServer} · #{b.toChannel}</b><em>{b.state === 'active' ? t('Active') : b.state === 'incoming' ? t('{name} wants to bridge', { name: b.toServer }) : t('Waiting for {name} to approve', { name: b.toServer })}</em></span></div>
          {b.state === 'incoming' && <><Button size="sm" variant="primary" onClick={() => { accept(b.id); toast('Bridge active'); }}>{t('Approve')}</Button><Button size="sm" onClick={() => update(d => { d.bridges = d.bridges.filter(x => x.id !== b.id); })}>{t('Decline')}</Button></>}
          {b.state === 'requested' && <><DemoTag>{t('Simulate partner')}</DemoTag><Button size="sm" onClick={() => { accept(b.id); toast('Bridge active'); }}>{t('They approve')}</Button></>}
          {b.state === 'active' && <Button size="sm" variant="danger-ghost" onClick={() => unlink(b.id)}>{t('Unlink')}</Button>}
        </li>
      ))}</ul>
    </div>
  );
}

export function SponsorSection({ serverId }: { serverId: string }) {
  const t = useT();
  const sv = useApp(s => s.servers[serverId]!);
  return (
    <div className="ss-page">
      {sv.sponsor ? <Note tone="ok" title={t('Sponsored by {name}', { name: sv.sponsor.name })}>{t('Until {date}. Shown in the sponsor slot under the community header.', { date: sv.sponsor.until })}</Note> : <p className="muted">{t('No sponsor yet.')}</p>}
      <Button icon={Megaphone} onClick={() => openModal({ kind: 'sponsor', serverId })} disabled={sv.kind === 'room'}>{t('Book the sponsor slot')}</Button>
      {sv.kind === 'room' && <p className="meta">{t('Rooms can’t take payments until approved as a server.')}</p>}
    </div>
  );
}
export function ExpertSection({ serverId }: { serverId: string }) {
  const t = useT();
  const sv = useApp(s => s.servers[serverId]!);
  const tickets = useApp(useShallow(s => s.expertTickets.filter(x => x.server === sv.name)));
  return (
    <div className="ss-page">
      <p>{t('Ghar experts can build your channels, roles, Developer Portal setup and branding for free. They get temporary access that’s removed when the work is done.')}</p>
      <Button variant="primary" icon={LifeBuoy} onClick={() => openModal({ kind: 'expertRequest', serverId })}>{t('Request expert help')}</Button>
      {tickets.map(x => <div key={x.id} className="panel panel-pad"><b>{x.need}</b><p className="meta">{t(({ requested: msg('Requested'), assigned: msg('Expert assigned'), 'in-progress': msg('In progress'), completed: msg('Completed, expert access removed') } as const)[x.state])}</p></div>)}
    </div>
  );
}
export function DeleteSection({ serverId }: { serverId: string }) {
  const t = useT();
  const sv = useApp(s => s.servers[serverId]!);
  return (
    <div className="ss-page">
      <Note tone="danger" title={t('Delete {name}', { name: sv.name })}>{t('Everything in it is removed for everyone. This can’t be undone.')}</Note>
      <Button variant="danger" icon={Trash2} onClick={() => ask({ title: msg('Delete {name}?'), vars: { name: sv.name }, body: msg('All channels, messages and roles are removed for everyone.'), confirmLabel: msg('Delete community'), tone: 'danger', typed: sv.name, onConfirm: () => { update(d => { d.joined = d.joined.filter(id => id !== serverId); delete d.servers[serverId]; }); go({ name: 'communities' }, { replace: true }); toast('Community deleted'); } })}>{t('Delete community')}</Button>
    </div>
  );
}
