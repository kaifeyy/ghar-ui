import { useEffect, useState } from 'react';
import { BadgeCheck, Clock } from 'lucide-react';
import { useApp, update } from '@/state/store';
import { toast } from '@/state/actions/ui';
import { useT, useLocale } from '@/i18n';
import { uid } from '@/domain/rng';
import { formatKarachi } from '@/domain/time';
import { Button } from '@/ui/Button';
import { Note, Section, Tag } from '@/ui/Misc';
import { RadioList, TextArea } from '@/ui/Form';
import { SettingsBody } from './SettingsPage';
import { QUESTIONS, PASS_MARK } from '@/fixtures/staff';
import { ME } from '@/fixtures/users';

const LIMIT = 15 * 60;

/** BDG-11: user-facing qualification. Choice questions are scored locally; scenarios and the badge need staff review. */
export function ModeratorSection() {
  const t = useT();
  const locale = useLocale();
  const mine = useApp(s => s.assessments.find(a => a.user === ME));
  const hasBadge = useApp(s => s.users[ME]!.badges.includes('mod'));
  const [started, setStarted] = useState(false);
  const [left, setLeft] = useState(LIMIT);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  useEffect(() => { if (!started) return; const i = setInterval(() => setLeft(l => Math.max(0, l - 1)), 1000); return () => clearInterval(i); }, [started]);
  const choice = QUESTIONS.filter(q => q.kind === 'choice');
  const complete = QUESTIONS.every(q => answers[q.id] !== undefined && String(answers[q.id]).trim().length > (q.kind === 'scenario' ? 20 : -1));
  const submit = () => {
    const correct = choice.filter(q => answers[q.id] === q.correct).length;
    const score = Math.round((correct / choice.length) * 100);
    update(s => { s.assessments.unshift({ id: uid('as'), user: ME, answers, score, submittedAt: Date.now(), state: 'pending-review' }); });
    setStarted(false);
    toast('Submitted. A staff reviewer checks your scenario answers before any badge is given.');
  };
  if (hasBadge) return <SettingsBody><Note tone="ok" title={t('You’re a Certified Moderator')}>{t('The badge shows on your profile and member cards.')}</Note></SettingsBody>;
  if (mine && !started) return (
    <SettingsBody>
      <Section title={t('Your assessment')}>
        <p className="row g8"><Tag tone={mine.state === 'passed' ? 'green' : mine.state === 'failed' ? 'red' : 'amber'}>{mine.state === 'pending-review' ? t('Waiting for staff review') : mine.state === 'passed' ? t('Passed') : t('Not passed')}</Tag><span className="meta">{formatKarachi(mine.submittedAt, { dateStyle: 'medium' }, locale)}</span></p>
        <p className="small">{t('Multiple-choice score: {n}% (pass mark {p}%).', { n: mine.score, p: PASS_MARK })}</p>
        {mine.state === 'failed' && <Button onClick={() => { update(s => { s.assessments = s.assessments.filter(a => a.id !== mine.id); }); setAnswers({}); }}>{t('Try again')}</Button>}
      </Section>
    </SettingsBody>
  );
  if (!started) return (
    <SettingsBody>
      <Section title={t('Become a Certified Moderator')} description={t('{n} questions including scenario cases. 15 minutes. The pass mark is set by the Ghar team ({p}% in this demo); staff review your answers before the badge is granted.', { n: QUESTIONS.length, p: PASS_MARK })}>
        <Button variant="primary" icon={BadgeCheck} onClick={() => { setStarted(true); setLeft(LIMIT); }}>{t('Start assessment')}</Button>
      </Section>
    </SettingsBody>
  );
  return (
    <SettingsBody>
      <p className={`row g8 ${left < 120 ? 'warn' : 'muted'}`} role="timer" aria-live={left < 120 ? 'polite' : 'off'}><Clock size={16} aria-hidden="true" />{t('Time left: {m}:{s}', { m: Math.floor(left / 60), s: String(left % 60).padStart(2, '0') })}</p>
      {left === 0 && <Note tone="warn">{t('Time’s up. Submit what you have.')}</Note>}
      <ol className="col g24">{QUESTIONS.map((q, i) => (
        <li key={q.id} className="panel panel-pad col g12">
          <span className="meta">{t('Question {i} of {n}', { i: i + 1, n: QUESTIONS.length })} · {q.kind === 'scenario' ? t('Scenario') : t('Multiple choice')}</span>
          {q.kind === 'choice' ? <RadioList name={q.id} legend={q.prompt} value={String(answers[q.id] ?? '')} onChange={v => setAnswers(a => ({ ...a, [q.id]: Number(v) }))} options={(q.options ?? []).map((o, j) => ({ value: String(j), label: o }))} />
            : <TextArea label={q.prompt} value={String(answers[q.id] ?? '')} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))} maxLength={800} hint={t('At least a couple of sentences.')} />}
        </li>
      ))}</ol>
      <div className="row g8"><Button onClick={() => setStarted(false)}>{t('Cancel')}</Button><Button variant="primary" disabled={!complete} onClick={submit}>{t('Submit for review')}</Button></div>
    </SettingsBody>
  );
}
