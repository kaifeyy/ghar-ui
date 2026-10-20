import { useMemo, useState } from 'react';
import { Check, Users } from 'lucide-react';
import { useApp } from '@/state/store';
import { finishOnboarding, setInterests } from '@/state/actions/auth';
import { joinDirectory } from '@/state/actions/community';
import { useT, msg, type Key } from '@/i18n';
import { Button } from '@/ui/Button';
import { CommunityIcon } from '@/ui/Art';
import { GharMark } from '@/ui/Brand';
import type { CommunityCategory } from '@/types/models';

const INTERESTS: { id: CommunityCategory; label: Key }[] = [
  { id: 'Gaming', label: msg('Gaming') }, { id: 'Study', label: msg('Study') }, { id: 'Jobs', label: msg('Jobs') },
  { id: 'Local cities', label: msg('Local cities') }, { id: 'Islamic', label: msg('Islamic') }, { id: 'Fun', label: msg('Fun') },
];

export function Onboarding() {
  const t = useT();
  const [step, setStep] = useState<1 | 2>(1);
  const [picked, setPicked] = useState<CommunityCategory[]>([]);
  const directory = useApp(s => s.directory);
  const joined = useApp(s => s.joined);
  const suggestions = useMemo(() => {
    const pool = picked.length ? directory.filter(d => picked.includes(d.category)) : directory;
    return [...pool].sort((a, b) => b.activity - a.activity || a.id.localeCompare(b.id)).slice(0, 6);
  }, [directory, picked]);
  const toggle = (c: CommunityCategory) => setPicked(p => (p.includes(c) ? p.filter(x => x !== c) : [...p, c]));
  return (
    <div className="auth">
      <header className="auth-top"><span className="row g8"><GharMark size={28} /><b className="auth-brand">Ghar</b></span><span className="meta">{t('Step {n} of 2', { n: step })}</span></header>
      <main className="auth-main">
        <section className="auth-card wide" aria-labelledby="ob-title">
          {step === 1 ? (
            <>
              <h1 id="ob-title" className="auth-title">{t('What are you into?')}</h1>
              <p className="auth-sub">{t('Pick a few. We’ll suggest communities to start with. You can skip this.')}</p>
              <div className="chip-grid" role="group" aria-label={t('Interests')}>
                {INTERESTS.map(i => {
                  const on = picked.includes(i.id);
                  return <button key={i.id} type="button" className={`chip-toggle ${on ? 'is-on' : ''}`} aria-pressed={on} onClick={() => toggle(i.id)}>{on && <Check size={16} aria-hidden />}{t(i.label)}</button>;
                })}
              </div>
              <div className="row g8 end mt24">
                <Button variant="ghost" onClick={() => { setInterests([]); setStep(2); }}>{t('Skip')}</Button>
                <Button variant="primary" onClick={() => { setInterests(picked); setStep(2); }}>{t('Continue')}</Button>
              </div>
            </>
          ) : (
            <>
              <h1 id="ob-title" className="auth-title">{t('Join a community or two')}</h1>
              <p className="auth-sub">{t('Suggested from your interests. Joining is instant and you can leave any time.')}</p>
              <ul className="ob-list">
                {suggestions.map(d => {
                  const isIn = joined.includes(d.id);
                  return (
                    <li key={d.id} className="ob-row">
                      <CommunityIcon id={d.id} name={d.name} color={d.color} size={44} />
                      <span className="grow person-text"><b className="ellip">{d.name}</b><em>{t(d.category)} · <Users size={12} aria-hidden /> {d.members.toLocaleString()}</em></span>
                      <Button size="sm" variant={isIn ? 'ghost' : 'secondary'} icon={isIn ? Check : undefined} disabled={isIn} onClick={() => joinDirectory(d.id)} aria-label={isIn ? t('Joined {name}', { name: d.name }) : t('Join {name}', { name: d.name })}>{isIn ? t('Joined') : t('Join')}</Button>
                    </li>
                  );
                })}
              </ul>
              <div className="row g8 end mt24">
                <Button variant="ghost" onClick={() => setStep(1)}>{t('Back')}</Button>
                <Button variant="primary" onClick={finishOnboarding}>{t('Go to Ghar')}</Button>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
