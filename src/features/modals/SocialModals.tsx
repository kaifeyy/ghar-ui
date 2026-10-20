import { useMemo, useState, type KeyboardEvent } from 'react';
import { Flag, ShieldCheck, Phone, PhoneOff, ExternalLink, Search, Hash, User as UserIcon, Settings, MessageSquare, Check } from 'lucide-react';
import { useApp, update, EMPTY } from '@/state/store';
import { closeModal, go, toast } from '@/state/actions/ui';
import { edit, type MsgKey } from '@/state/actions/messages';
import { acceptCall, declineCall } from '@/state/actions/calls';
import { acknowledgeIpWarning } from '@/state/actions/audio';
import { requestRelationship, createGroup, updateGroup, leaveGroup, dmWith } from '@/state/actions/social';
import { useT, msg, type Key } from '@/i18n';
import type { RelationshipType, ReportReason, ProofState } from '@/types/models';
import { uid } from '@/domain/rng';
import { matchScore } from '@/domain/search';
import { relationshipAllowed } from '@/domain/age';
import { Dialog } from '@/ui/Overlay';
import { Button } from '@/ui/Button';
import { Checkbox, RadioList, Select, TextArea, TextField } from '@/ui/Form';
import { Avatar } from '@/ui/Avatar';
import { CommunityIcon } from '@/ui/Art';
import { DemoTag, Note, Tag } from '@/ui/Misc';
import { REL_LABEL } from '@/features/home/HomeScreens';
import { SECTIONS } from '@/features/settings/settingsIndex';
import type { ModalState } from '@/state/types';
import { ME } from '@/fixtures/users';

const REASONS: Record<ReportReason, Key> = { spam: msg('Spam'), harassment: msg('Harassment or bullying'), hate: msg('Hate speech'), 'self-harm': msg('Self-harm or suicide'), scam: msg('Scam or fraud'), sexual: msg('Sexual content'), 'minor-safety': msg('Child safety'), other: msg('Something else') };
const MAX_CONTEXT = 10;

export function ReportModal({ target }: { target: Extract<ModalState, { kind: 'report' }>['target'] }) {
  const t = useT();
  const users = useApp(s => s.users);
  const list = useApp(s => (target.kind === 'message' ? (target.scope === 'dm' ? s.conversations[target.key]?.messages : s.messages[target.key]) ?? EMPTY : EMPTY));
  const encrypted = useApp(s => (target.kind === 'message' ? (target.scope === 'dm' ? !!s.conversations[target.key]?.e2ee : !!s.servers[s.channels[target.key]?.serverId ?? '']?.e2ee) : false));
  const recent = useApp(s => s.reports.filter(r => r.reporter === ME && Date.now() - r.at < 3_600_000).length);
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [details, setDetails] = useState('');
  const [ctx, setCtx] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ proof: ProofState } | null>(null);
  const reported = target.kind === 'message' ? list.find(m => m.id === target.messageId) : undefined;
  const idx = reported ? list.indexOf(reported) : -1;
  const around = idx >= 0 ? list.slice(Math.max(0, idx - 6), idx + 5).filter(m => m.id !== reported?.id && !m.system) : [];
  const title = target.kind === 'message' ? t('Report message') : target.kind === 'user' ? t('Report {name}', { name: users[target.userId]?.name ?? '' }) : t('Report community');
  const proofFor = (edited: boolean): ProofState => (!encrypted ? 'not-applicable' : edited ? 'unverified' : 'verified');

  const submit = () => {
    if (!reason) { setErr(t('Choose a reason.')); return; }
    if (recent >= 20) { setErr(t('You’ve sent a lot of reports in the last hour. Try again later.')); return; }
    const evidence = reported ? [reported, ...list.filter(m => ctx.includes(m.id))].map(m => ({ author: users[m.author]?.handle ?? m.author, text: m.text, at: m.at, proof: proofFor(!!m.editedAt), ...(m.id === reported.id ? { reported: true } : {}) })) : [];
    update(d => {
      d.reports.unshift({ id: uid('rp'), kind: target.kind, reason, reporter: ME, at: Date.now(), encrypted, priority: false, status: 'open', evidence,
        target: target.kind === 'user' ? target.userId : target.kind === 'server' ? target.serverId : reported?.author ?? '',
        title: `${t(REASONS[reason])}${details.trim() ? ': ' + details.trim().slice(0, 80) : ''}`,
        where: target.kind === 'server' ? d.servers[target.serverId]?.name ?? '' : target.kind === 'message' ? (target.scope === 'dm' ? 'Direct message' : '#' + (d.channels[target.key]?.name ?? '')) : 'Profile' });
    });
    setDone({ proof: reported ? proofFor(!!reported.editedAt) : 'not-applicable' });
  };

  if (done) return (
    <Dialog title={t('Report sent')} onClose={closeModal} size="sm" footer={<Button variant="primary" onClick={closeModal} data-autofocus>{t('Done')}</Button>}>
      <p>{t('Thanks. The Ghar safety team reviews reports. You won’t see who handles it, and the person isn’t told who reported them.')}</p>
      {done.proof !== 'not-applicable' && (
        <Note tone={done.proof === 'verified' ? 'ok' : 'warn'} title={done.proof === 'verified' ? t('Simulated proof check: verified') : t('Simulated proof check: unverified')}>
          {done.proof === 'verified' ? t('In the real app, a cryptographic check would confirm this exact message was sent by that person. This demo only simulates the result.') : t('Edited messages can’t be matched to their original proof, so this would reach the team as unverified.')}
        </Note>
      )}
    </Dialog>
  );
  return (
    <Dialog title={title} description={t('Reports go to the Ghar safety team, not community moderators.')} onClose={closeModal} onSubmit={submit} size="md"
      footer={<><Button onClick={closeModal}>{t('Cancel')}</Button><Button type="submit" variant="danger" icon={Flag}>{t('Send report')}</Button></>}>
      <RadioList name="reason" legend={t('What’s wrong?')} value={reason as ReportReason} onChange={v => { setReason(v); setErr(null); }} options={(Object.keys(REASONS) as ReportReason[]).map(r => ({ value: r, label: t(REASONS[r]) }))} />
      {err && <p className="ferr" role="alert">{err}</p>}
      {reason === 'self-harm' && <Note tone="warn">{t('If someone is in immediate danger, contact local emergency services. This report also alerts trained moderators.')}</Note>}
      {reported && (
        <section className="col g8">
          <h3 className="flabel">{t('Reported message')}</h3>
          <blockquote className="quote"><b>{users[reported.author]?.name}</b><span>{reported.text}</span>{reported.editedAt && <Tag tone="amber">{t('Edited')}</Tag>}</blockquote>
          {around.length > 0 && (
            <fieldset className="col g4">
              <legend className="flabel">{t('Add surrounding messages for context (up to {n})', { n: MAX_CONTEXT })}</legend>
              {around.map(m => <Checkbox key={m.id} label={<><b>{users[m.author]?.name}:</b> {m.text}</>} checked={ctx.includes(m.id)} disabled={!ctx.includes(m.id) && ctx.length >= MAX_CONTEXT} onChange={v => setCtx(c => (v ? [...c, m.id] : c.filter(x => x !== m.id)))} />)}
            </fieldset>
          )}
          {encrypted && <p className="meta row g8"><ShieldCheck size={14} aria-hidden="true" />{t('Encrypted messages: reporting shares only the selected messages with the safety team, each with a proof of who sent it.')}<DemoTag>{t('Proof check is simulated')}</DemoTag></p>}
        </section>
      )}
      <TextArea label={t('Anything else? (optional)')} value={details} onChange={e => setDetails(e.target.value)} maxLength={500} count={details.length} />
    </Dialog>
  );
}

export function RelationshipModal({ withId }: { withId?: string }) {
  const t = useT();
  const friends = useApp(s => s.friends);
  const users = useApp(s => s.users);
  const group = useApp(s => s.ageGroup);
  const [who, setWho] = useState(withId ?? '');
  const [type, setType] = useState<RelationshipType>('best-friend');
  const [err, setErr] = useState<string | null>(null);
  const submit = () => {
    const r = requestRelationship(who, type);
    if (r.ok) closeModal();
    else setErr(r.error === 'minor' ? t('Partner relationships aren’t available on under-18 accounts.') : r.error === 'exists' ? t('You already have a relationship or request with this person.') : t('Choose a friend.'));
  };
  return (
    <Dialog title={t('Add a relationship')} description={t('They must accept before it shows on either profile.')} onClose={closeModal} onSubmit={submit}
      footer={<><Button onClick={closeModal}>{t('Cancel')}</Button><Button type="submit" variant="primary">{t('Send request')}</Button></>}>
      <Select label={t('Friend')} value={who} onValue={v => { setWho(v); setErr(null); }} options={[['', t('Choose a friend')], ...friends.map(f => [f, users[f]?.name ?? f] as const)]} />
      <RadioList name="reltype" legend={t('Relationship')} variant="cards" value={type} onChange={v => { setType(v); setErr(null); }}
        options={(Object.keys(REL_LABEL) as RelationshipType[]).map(r => ({ value: r, label: t(REL_LABEL[r]), disabled: !relationshipAllowed(group, r), disabledReason: !relationshipAllowed(group, r) ? t('Not available under 18') : undefined }))} />
      {err && <p className="ferr" role="alert">{err}</p>}
    </Dialog>
  );
}

export function GroupDmModal({ convId }: { convId?: string }) {
  const t = useT();
  const conv = useApp(s => (convId ? s.conversations[convId] : undefined));
  const friends = useApp(s => s.friends);
  const users = useApp(s => s.users);
  const [name, setName] = useState(conv?.name ?? '');
  const [members, setMembers] = useState<string[]>(conv ? conv.members.filter(m => m !== ME) : []);
  const [err, setErr] = useState<string | null>(null);
  const max = 9;
  const submit = () => {
    if (members.length < 2) { setErr(t('Pick at least 2 friends.')); return; }
    if (conv) { updateGroup(conv.id, name, members); closeModal(); }
    else { const id = createGroup(name, members); closeModal(); go({ name: 'dm', convId: id }); }
  };
  return (
    <Dialog title={conv ? t('Manage group') : t('New group message')} description={t('Up to {n} people besides you. Calls with more than 4 people are relayed and video pauses.', { n: max })} onClose={closeModal} onSubmit={submit}
      footer={<>{conv && <Button variant="danger-ghost" onClick={() => { closeModal(); leaveGroup(conv.id); }}>{t('Leave group')}</Button>}<span className="grow" /><Button onClick={closeModal}>{t('Cancel')}</Button><Button type="submit" variant="primary">{conv ? t('Save') : t('Create group')}</Button></>}>
      <TextField label={t('Group name (optional)')} value={name} onChange={e => setName(e.target.value)} maxLength={40} />
      <fieldset className="col g4">
        <legend className="flabel">{t('Members ({n} selected)', { n: members.length })}</legend>
        {friends.map(f => <Checkbox key={f} label={<span className="row g8"><Avatar userId={f} size={24} />{users[f]?.name}</span>} checked={members.includes(f)} disabled={!members.includes(f) && members.length >= max} onChange={v => { setMembers(m => (v ? [...m, f] : m.filter(x => x !== f))); setErr(null); }} />)}
      </fieldset>
      {err && <p className="ferr" role="alert">{err}</p>}
    </Dialog>
  );
}

export function IncomingCallModal({ convId }: { convId: string }) {
  const t = useT();
  const conv = useApp(s => s.conversations[convId]);
  const caller = conv?.kind === 'dm' ? conv.members[0]! : conv?.members.find(m => m !== ME) ?? '';
  const name = useApp(s => (conv?.kind === 'group' ? conv.name ?? '' : s.users[caller]?.name ?? ''));
  return (
    <Dialog title={t('Incoming call')} onClose={declineCall} size="sm" role="alertdialog"
      footer={<><Button variant="danger" icon={PhoneOff} onClick={declineCall}>{t('Decline')}</Button><Button variant="green" icon={Phone} onClick={() => { acceptCall(); go({ name: 'dm', convId }); }} data-autofocus>{t('Accept')}</Button></>}>
      <div className="col g12 center-col"><span className="ring-av"><Avatar userId={caller} size={88} /></span><b className="dlg-title">{name}</b><DemoTag>{t('Demo call: no audio')}</DemoTag></div>
    </Dialog>
  );
}

export function IpWarningModal({ then }: { then: 'video' | 'share' }) {
  const t = useT();
  const [hide, setHide] = useState(false);
  return (
    <Dialog title={t('Before your first video call')} onClose={closeModal} onSubmit={() => acknowledgeIpWarning(then, hide)} size="sm"
      footer={<><Button onClick={closeModal}>{t('Not now')}</Button><Button type="submit" variant="primary">{then === 'video' ? t('Turn on camera') : t('Share screen')}</Button></>}>
      <p>{t('Video and screen share with up to 4 people connect directly between devices to keep them free. People in the call can see your IP address.')}</p>
      <p className="muted small">{t('Voice channels are always relayed, so your IP stays hidden there.')}</p>
      <Checkbox label={t('Hide my IP (relay my video through Ghar instead)')} checked={hide} onChange={setHide} description={t('You can change this later in Privacy & safety.')} />
    </Dialog>
  );
}

export function ExternalLinkModal({ href }: { href: string }) {
  const t = useT();
  const host = (() => { try { return new URL(href).host; } catch { return href; } })();
  return (
    <Dialog title={t('Leaving Ghar')} onClose={closeModal} size="sm"
      footer={<><Button onClick={closeModal} data-autofocus>{t('Stay')}</Button><Button variant="primary" icon={ExternalLink} onClick={() => { window.open(href, '_blank', 'noopener,noreferrer'); closeModal(); }}>{t('Open link')}</Button></>}>
      <p>{t('This link goes to {host}. Ghar doesn’t check what’s on other sites.', { host })}</p>
      <code className="block">{href}</code>
    </Dialog>
  );
}

export function EditMessageModal({ scope, keyId, messageId }: { scope: MsgKey['scope']; keyId: string; messageId: string }) {
  const t = useT();
  const k: MsgKey = { scope, id: keyId };
  const original = useApp(s => (scope === 'channel' ? s.messages[keyId] : scope === 'dm' ? s.conversations[keyId]?.messages : s.threads[keyId]?.messages)?.find(m => m.id === messageId)?.text ?? '');
  const [v, setV] = useState(original);
  return (
    <Dialog title={t('Edit message')} onClose={closeModal} onSubmit={() => { if (edit(k, messageId, v)) closeModal(); }}
      footer={<><Button onClick={closeModal}>{t('Cancel')}</Button><Button type="submit" variant="primary" disabled={!v.trim() || v === original}>{t('Save')}</Button></>}>
      <TextArea label={t('Message')} value={v} onChange={e => setV(e.target.value)} autoFocus maxLength={2000} count={v.length} />
      <p className="meta">{t('Edited messages show “(edited)”.')}</p>
    </Dialog>
  );
}

/** Quick switcher (Ctrl K): a combobox over people, conversations, channels, communities and settings. */
export function QuickSwitcher() {
  const t = useT();
  const s = useApp(x => x);
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  type Item = { id: string; label: string; sub: string; icon: React.ReactNode; go: () => void };
  const items: Item[] = useMemo(() => {
    const out: (Item & { score: number })[] = [];
    const add = (score: number, it: Item) => { if (score > 0 || !q.trim()) out.push({ ...it, score: score || 1 }); };
    for (const u of Object.values(s.users)) if (u.id !== ME && !u.bot && !s.blocked.includes(u.id)) add(matchScore(q, [u.name, u.handle]), { id: 'u' + u.id, label: u.name, sub: '@' + u.handle, icon: <Avatar userId={u.id} size={24} />, go: () => go({ name: 'dm', convId: dmWith(u.id) }) });
    for (const c of Object.values(s.conversations)) if (c.kind === 'group') add(matchScore(q, [c.name ?? '']), { id: 'g' + c.id, label: c.name ?? '', sub: t('Group'), icon: <MessageSquare size={18} />, go: () => go({ name: 'dm', convId: c.id }) });
    for (const id of s.joined) { const sv = s.servers[id]!; add(matchScore(q, [sv.name]), { id: 's' + id, label: sv.name, sub: t('Community'), icon: <CommunityIcon id={sv.id} name={sv.name} color={sv.color} size={24} />, go: () => go({ name: 'channel', serverId: id, channelId: sv.categories[0]?.channelIds[0] ?? '' }) });
      for (const cat of sv.categories) for (const cid of cat.channelIds) { const c = s.channels[cid]; if (c) add(matchScore(q, [c.name]) * 0.9, { id: 'c' + cid, label: c.name, sub: sv.name, icon: <Hash size={18} />, go: () => go({ name: 'channel', serverId: id, channelId: cid }) }); } }
    for (const sec of SECTIONS) add(matchScore(q, [t(sec.label), sec.keywords]) * 0.8, { id: 'set' + sec.id, label: t(sec.label), sub: t('Settings'), icon: <Settings size={18} />, go: () => go({ name: 'settings', section: sec.id }) });
    return out.sort((a, b) => b.score - a.score).slice(0, 12);
  }, [q, s, t]);
  const pick = (it?: Item) => { if (!it) return; closeModal(); it.go(); };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(items.length - 1, i + 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(0, i - 1)); }
    if (e.key === 'Enter') { e.preventDefault(); pick(items[idx]); }
  };
  return (
    <Dialog title={t('Jump to')} onClose={closeModal} size="md" className="quick">
      <div className="fbox"><Search size={16} aria-hidden="true" className="mut" />
        <input aria-label={t('Search people, chats, channels and settings')} placeholder={t('Search people, chats, channels and settings')} value={q} onChange={e => { setQ(e.target.value); setIdx(0); }} onKeyDown={onKey} autoFocus
          role="combobox" aria-expanded="true" aria-controls="quick-list" aria-activedescendant={items[idx] ? 'qi-' + items[idx]!.id : undefined} aria-autocomplete="list" />
      </div>
      <ul id="quick-list" role="listbox" aria-label={t('Results')} className="qlist">
        {items.map((it, i) => (
          <li key={it.id} id={'qi-' + it.id} role="option" aria-selected={i === idx} className={`qrow ${i === idx ? 'is-on' : ''}`} onMouseDown={e => { e.preventDefault(); pick(it); }} onMouseEnter={() => setIdx(i)}>
            <span className="qrow-ic">{it.icon}</span><span className="grow ellip"><b dir="auto">{it.label}</b></span><span className="meta">{it.sub}</span>
          </li>
        ))}
        {!items.length && <li className="meta pad12">{t('No results. Check the spelling or try fewer words.')}</li>}
      </ul>
      <p className="meta">{t('Use ↑ ↓ to move and Enter to open.')}</p>
    </Dialog>
  );
}

export function MemberCardModal({ serverId, userId }: { serverId: string; userId: string }) {
  const t = useT();
  const sv = useApp(s => s.servers[serverId]);
  const user = useApp(s => s.users[userId]);
  const mem = sv?.memberList.find(m => m.userId === userId);
  if (!sv || !user) return null;
  const roles = sv.roles.filter(r => mem?.roleIds.includes(r.id) && !r.system);
  return (
    <Dialog title={user.name} description={'@' + user.handle} onClose={closeModal} size="sm"
      footer={<><Button icon={UserIcon} onClick={() => { closeModal(); go({ name: 'profile', userId }); }}>{t('Full profile')}</Button>{userId !== ME && <Button variant="primary" icon={MessageSquare} onClick={() => { closeModal(); go({ name: 'dm', convId: dmWith(userId) }); }}>{t('Message')}</Button>}</>}>
      <div className="row g12"><Avatar userId={userId} size={56} showPresence /><span className="muted small">{user.bio}</span></div>
      <h3 className="label">{t('Roles in {name}', { name: sv.name })}</h3>
      {sv.roleCategories.map(cat => {
        const rs = roles.filter(r => r.categoryId === cat.id);
        if (!rs.length) return null;
        return (
          <div key={cat.id} className="col g4"><span className="meta">{cat.name}</span>
            <div className="row g4 wrap">{rs.map(r => <span key={r.id} className="role-chip"><span className="role-dot" style={{ background: r.color2 ? `linear-gradient(90deg, ${r.color1}, ${r.color2})` : r.color1 }} aria-hidden="true" />{r.name}</span>)}</div>
          </div>
        );
      })}
      {!roles.length && <p className="meta">{t('No roles yet.')}</p>}
      {mem?.timeoutUntil && mem.timeoutUntil > Date.now() && <Tag tone="amber">{t('Timed out')}</Tag>}
    </Dialog>
  );
}

export function JoinInviteModal() {
  const t = useT();
  const [code, setCode] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const submit = () => {
    const c = code.trim().replace(/^https?:\/\/[^/]+\//, '').replace(/^invite\//, '');
    const inv = useApp.getState().invites.find(i => i.code === c);
    if (!c) { setErr(t('Paste an invite link or code.')); return; }
    if (!inv) { setErr(t('That invite is invalid or has expired.')); return; }
    if (inv.expiresAt && inv.expiresAt < Date.now()) { setErr(t('That invite has expired.')); return; }
    if (inv.maxUses && inv.uses >= inv.maxUses) { setErr(t('That invite has reached its limit.')); return; }
    update(d => { const i = d.invites.find(x => x.code === c); if (i) i.uses += 1; if (!d.joined.includes('tc')) d.joined.push('tc'); });
    closeModal(); go({ name: 'channel', serverId: 'tc', channelId: 'tc-general' }); toast('Invite accepted');
  };
  return (
    <Dialog title={t('Join with an invite')} onClose={closeModal} onSubmit={submit} size="sm" footer={<><Button onClick={closeModal}>{t('Cancel')}</Button><Button type="submit" variant="primary" icon={Check}>{t('Join')}</Button></>}>
      <TextField label={t('Invite link or code')} value={code} onChange={e => { setCode(e.target.value); setErr(null); }} error={err} placeholder="ghar.gg/club-fri" autoFocus hint={t('Try: club-fri')} />
    </Dialog>
  );
}
