import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, Check, AlertCircle, Loader, Mail, Smartphone, ShieldCheck, Globe } from 'lucide-react';
import { useApp, update } from '@/state/store';
import { login, signup, setAuthStep, verifyEmailDemo, pickInitialUsername, enterApp } from '@/state/actions/auth';
import { verifyPhone } from '@/state/actions/profile';
import { useT, msg, LANGS, type Key } from '@/i18n';
import { Button } from '@/ui/Button';
import { TextField, Checkbox, Select } from '@/ui/Form';
import { Note, DemoTag } from '@/ui/Misc';
import { GharMark } from '@/ui/Brand';
import { ME } from '@/fixtures/users';
import { buildBloom, checkAvailability, type Availability } from '@/domain/username';
import { DatePicker } from '@/ui/Pickers';

const RULES: Record<string, Key> = {
  'too-short': msg('At least 3 characters.'),
  'too-long': msg('At most 32 characters.'),
  charset: msg('Use only a–z, 0–9, underscore and dot.'),
  'dot-edge': msg('Can’t start or end with a dot.'),
  'double-dot': msg('Can’t contain two dots in a row.'),
};

function Card({ title, sub, back, children }: { title: string; sub?: ReactNode; back?: () => void; children: ReactNode }) {
  const t = useT();
  const h = useRef<HTMLHeadingElement>(null);
  useEffect(() => { h.current?.focus(); }, [title]);
  return (
    <section className="auth-card" aria-labelledby="auth-title">
      {back && <button type="button" className="auth-back" onClick={back}><ArrowLeft size={16} className="flip" aria-hidden />{t('Back')}</button>}
      <h1 id="auth-title" ref={h} tabIndex={-1} className="auth-title">{title}</h1>
      {sub && <p className="auth-sub">{sub}</p>}
      {children}
    </section>
  );
}

function Login() {
  const t = useT();
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setTimeout(() => {
      const r = login(id, pw);
      setBusy(false);
      if (r.ok) return;
      setPw('');
      setErr(r.error === 'missing' ? t('Enter your email or username and password.') : r.error === 'locked' ? t('Too many attempts. Try again in 15 minutes, or reset your password.') : t('That password doesn’t match. {n} attempts left.', { n: r.attemptsLeft ?? 0 }));
    }, 450);
  };
  return (
    <Card title={t('Welcome back')} sub={t('Sign in to your communities, friends and DMs.')}>
      <form className="stack g12" onSubmit={submit} noValidate>
        <TextField label={t('Email or username')} value={id} onChange={e => setId(e.target.value)} autoComplete="username" dir="ltr" required />
        <TextField label={t('Password')} type="password" value={pw} onChange={e => setPw(e.target.value)} autoComplete="current-password" required />
        {err && <Note tone="danger">{err}</Note>}
        <Button type="submit" variant="primary" loading={busy} block>{t('Sign in')}</Button>
        <button type="button" className="linkish" onClick={() => setAuthStep('reset')}>{t('Forgot password?')}</button>
      </form>
      <div className="auth-or"><span>{t('or')}</span></div>
      <Button icon={Globe} block disabled aria-describedby="g-note">{t('Continue with Google')}</Button>
      <p id="g-note" className="meta center">{t('Google sign-in needs the real service and isn’t available in this frontend demo.')}</p>
      <p className="auth-foot">{t('New to Ghar?')} <button type="button" className="linkish" onClick={() => setAuthStep('signup')}>{t('Create an account')}</button></p>
      <Note tone="info" className="mt12">{t('Demo: any email and password sign in. The password “wrong” fails, and five failures lock sign-in. Nothing is sent or stored.')}</Note>
    </Card>
  );
}

function Signup() {
  const t = useT();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [dob, setDob] = useState('');
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<'email' | 'password' | 'dob' | 'agree', string>>>({});
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!agree) { setErrors({ agree: t('Accept the terms to continue.') }); return; }
    const r = signup(email, pw, dob);
    if (r.ok) return;
    if ('errors' in r) setErrors(Object.fromEntries(Object.entries(r.errors).map(([k, v]) => [k, t(v as Key)])));
  };
  const strength = pw.length === 0 ? null : pw.length < 8 ? 'weak' : /[0-9]/.test(pw) && /[^a-zA-Z0-9]/.test(pw) && pw.length >= 12 ? 'strong' : 'ok';
  return (
    <Card title={t('Create your account')} sub={t('It takes a minute. You can add a phone number later.')} back={() => setAuthStep('login')}>
      <form className="stack g12" onSubmit={submit} noValidate>
        <TextField label={t('Email')} type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" dir="ltr" error={errors.email} required />
        <TextField label={t('Password')} type="password" value={pw} onChange={e => setPw(e.target.value)} autoComplete="new-password" error={errors.password}
          hint={strength ? (strength === 'weak' ? t('Too short') : strength === 'ok' ? t('Okay. Longer with symbols is stronger.') : t('Strong')) : t('At least 8 characters.')} required />
        <DatePicker label={t('Date of birth')} value={dob} onChange={setDob} max={new Date().toISOString().slice(0, 10)} min="1900-01-01" error={errors.dob} hint={t('Used to apply age-appropriate settings. Not shown on your profile.')} required />
        <Checkbox label={t('I agree to the Terms and Community Guidelines')} checked={agree} onChange={setAgree} />
        {errors.agree && <p className="field-err" role="alert">{errors.agree}</p>}
        <Button type="submit" variant="primary" block>{t('Continue')}</Button>
      </form>
    </Card>
  );
}

function Young() {
  const t = useT();
  return (
    <Card title={t('You need to be 13 or older')} sub={t('Ghar isn’t available for people under 13. Nothing you entered has been kept.')}>
      <Button block onClick={() => setAuthStep('login')}>{t('Back to sign in')}</Button>
    </Card>
  );
}

function VerifyEmail() {
  const t = useT();
  return (
    <Card title={t('Check your email')} sub={t('We’d send a confirmation link to your inbox. In this demo, use the button below instead.')} back={() => setAuthStep('signup')}>
      <div className="auth-illus" aria-hidden><Mail size={40} /></div>
      <Button variant="primary" block onClick={verifyEmailDemo}>{t('I’ve confirmed my email (demo)')}</Button>
      <DemoTag>{t('No email is sent')}</DemoTag>
    </Card>
  );
}

function PickUsername() {
  const t = useT();
  const users = useApp(s => s.users);
  const holds = useApp(s => s.usernameHolds);
  const reserved = useApp(s => s.reserved);
  const reg = useMemo(() => ({ active: new Map(Object.values(users).filter(u => u.id !== ME).map(u => [u.handle, u.id] as const)), holds, reserved }), [users, holds, reserved]);
  const bloom = useMemo(() => buildBloom(reg), [reg]);
  const [v, setV] = useState('');
  const [a, setA] = useState<Availability | null>(null);
  const [checking, setChecking] = useState(false);
  useEffect(() => {
    if (!v) { setA(null); return; }
    setChecking(true);
    const id = setTimeout(() => { setA(checkAvailability(v, '__new__', reg, Date.now(), bloom)); setChecking(false); }, 250);
    return () => clearTimeout(id);
  }, [v, reg, bloom]);
  const ok = !checking && a?.state === 'available';
  const status = checking ? <span className="st st-mut"><Loader size={14} className="spin" aria-hidden />{t('Checking…')}</span>
    : !a ? null
    : a.state === 'available' ? <span className="st st-ok"><Check size={14} aria-hidden />{t('Available')}</span>
    : <span className="st st-bad"><AlertCircle size={14} aria-hidden />{a.state === 'invalid' ? t(RULES[a.error]!) : a.state === 'reserved' ? t('Reserved by the Ghar team.') : a.state === 'held' || a.state === 'held-by-you' ? t('Held for its previous owner for 30 days.') : t('Taken.')}</span>;
  return (
    <Card title={t('Pick a username')} sub={t('People find and @mention you with it. You can change it twice every 14 days.')}>
      <form className="stack g12" onSubmit={e => { e.preventDefault(); if (ok) pickInitialUsername(v); }}>
        <TextField label={t('Username')} prefix="@" value={v} onChange={e => setV(e.target.value.toLowerCase().replace(/\s/g, ''))} autoComplete="off" spellCheck={false} dir="ltr" hint={t('3–32 characters: a–z, 0–9, underscore and dot.')} />
        <div aria-live="polite" className="min-row">{status}</div>
        <Button type="submit" variant="primary" block disabled={!ok}>{t('Continue')}</Button>
      </form>
      <p className="meta">{t('Try “bilal” (taken), “atifaslam” (reserved) or a new name.')}</p>
    </Card>
  );
}

function Phone() {
  const t = useT();
  const [num, setNum] = useState('');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const valid = /^(\+92|0)?3\d{9}$/.test(num.replace(/[\s-]/g, ''));
  return (
    <Card title={t('Add a phone number (optional)')} sub={t('Needed to own a server or receive payouts. Never shown to anyone.')}>
      {!sent ? (
        <form className="stack g12" onSubmit={e => { e.preventDefault(); if (valid) setSent(true); }}>
          <TextField label={t('Mobile number')} type="tel" inputMode="tel" value={num} onChange={e => setNum(e.target.value)} placeholder="03xx xxxxxxx" dir="ltr" icon={Smartphone} autoComplete="tel" />
          <Button type="submit" variant="primary" block disabled={!valid}>{t('Send code')}</Button>
        </form>
      ) : (
        <form className="stack g12" onSubmit={e => {
          e.preventDefault();
          if (code === '000000' || code.length !== 6) { setErr(t('That code isn’t right. Check it and try again.')); return; }
          verifyPhone(num); setAuthStep('onboarding'); enterApp(true);
        }}>
          <TextField label={t('6-digit code')} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setErr(''); }} error={err || undefined} dir="ltr" className="otp-field" />
          <p className="meta">{t('Demo: any 6 digits work except 000000. No SMS is sent and the number isn’t stored.')}</p>
          <Button type="submit" variant="primary" block icon={ShieldCheck}>{t('Verify')}</Button>
        </form>
      )}
      <Button variant="ghost" className="block mt8" onClick={() => enterApp(true)}>{t('Skip for now')}</Button>
    </Card>
  );
}

function Reset() {
  const t = useT();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  return (
    <Card title={t('Reset your password')} back={() => setAuthStep('login')} sub={sent ? t('If an account uses that email, a reset link would be sent. This demo doesn’t send email.') : t('Enter your account email and we’ll send a reset link.')}>
      {!sent ? (
        <form className="stack g12" onSubmit={e => { e.preventDefault(); if (email.includes('@')) setSent(true); }}>
          <TextField label={t('Email')} type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" dir="ltr" />
          <Button type="submit" variant="primary" block disabled={!email.includes('@')}>{t('Send reset link')}</Button>
        </form>
      ) : <Button block onClick={() => setAuthStep('login')}>{t('Back to sign in')}</Button>}
    </Card>
  );
}

export function AuthScreen() {
  const t = useT();
  const step = useApp(s => s.authStep);
  const lang = useApp(s => s.prefs.lang);
  const body = step === 'signup' ? <Signup /> : step === 'young' ? <Young /> : step === 'verify-email' ? <VerifyEmail /> : step === 'username' ? <PickUsername />
    : step === 'phone' || step === 'otp' ? <Phone /> : step === 'reset' ? <Reset /> : <Login />;
  return (
    <div className="auth">
      <header className="auth-top">
        <span className="row g8"><GharMark size={28} /><b className="auth-brand">Ghar</b></span>
        <Select label={t('Language')} srLabel value={lang} onValue={v => update(s => { s.prefs.lang = v; })} options={LANGS.map(l => [l.id, l.native] as const)} className="auth-lang" />
      </header>
      <main className="auth-main">
        <div className="auth-stage">
          <div className="auth-glow" aria-hidden="true" />
          {body}
        </div>
      </main>
      <footer className="auth-legal meta">{t('Frontend demo with fictional data. No account, message or payment leaves this browser.')}</footer>
    </div>
  );
}
