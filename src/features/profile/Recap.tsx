import { useMemo, useState } from 'react';
import { Download, ChevronLeft, ChevronRight, Headphones, MessageSquare, LayoutGrid, UserPlus, PartyPopper } from 'lucide-react';
import { useApp, update } from '@/state/store';
import { download } from '@/state/actions/auth';
import { toast } from '@/state/actions/ui';
import { useT } from '@/i18n';
import { fmt } from '@/domain/format';
import { asHours } from '@/domain/leaderboard';
import { Dialog } from '@/ui/Overlay';
import { Button } from '@/ui/Button';
import { DemoTag } from '@/ui/Misc';
import { ME } from '@/fixtures/users';

/** EVT-04 year-end recap: story-style cards from this demo's activity records. */
export function Recap() {
  const open = useApp(s => s.recapOpen);
  if (!open) return null;
  return <RecapDialog />;
}
function RecapDialog() {
  const t = useT();
  const activity = useApp(s => s.activity);
  const friends = useApp(s => s.friends);
  const joined = useApp(s => s.joined);
  const name = useApp(s => s.users[ME]!.name);
  const [i, setI] = useState(0);
  const stats = useMemo(() => {
    const mine = activity.filter(a => a.userId === ME);
    return { voice: asHours(mine.reduce((n, a) => n + a.voiceMinutes, 0)), messages: mine.reduce((n, a) => n + a.messages, 0), servers: new Set(mine.map(a => a.serverId)).size || joined.length, people: friends.length };
  }, [activity, friends, joined]);
  const cards = [
    { icon: PartyPopper, big: name, text: t('Your year on Ghar') },
    { icon: Headphones, big: t('{n} hours', { n: stats.voice }), text: t('in voice channels') },
    { icon: MessageSquare, big: fmt(stats.messages), text: t('messages sent') },
    { icon: LayoutGrid, big: String(stats.servers), text: t('communities you were active in') },
    { icon: UserPlus, big: String(stats.people), text: t('people you’re friends with') },
  ];
  const c = cards[i]!;
  const close = () => update(s => { s.recapOpen = false; });
  const share = () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350"><rect width="100%" height="100%" fill="#18191C"/><text x="80" y="200" fill="#F2F3F5" font-family="sans-serif" font-size="64" font-weight="700">${name.replace(/[<&>]/g, '')} on Ghar</text><text x="80" y="420" fill="#3CCB91" font-family="sans-serif" font-size="120" font-weight="700">${stats.voice} h</text><text x="80" y="500" fill="#B5BAC5" font-family="sans-serif" font-size="44">in voice</text><text x="80" y="720" fill="#F2F3F5" font-family="sans-serif" font-size="120" font-weight="700">${stats.messages}</text><text x="80" y="800" fill="#B5BAC5" font-family="sans-serif" font-size="44">messages</text><text x="80" y="1250" fill="#949BA8" font-family="sans-serif" font-size="32">Demo recap · fictional sample data</text></svg>`;
    download('ghar-recap.svg', svg, 'image/svg+xml');
    toast('Recap card downloaded');
  };
  return (
    <Dialog title={t('Your year on Ghar')} onClose={close} size="sm" className="recap-dlg"
      footer={<><DemoTag>{t('Sample data')}</DemoTag><Button icon={Download} onClick={share}>{t('Download card')}</Button></>}>
      <div className="recap-card" aria-live="polite">
        <c.icon size={36} aria-hidden="true" />
        <b className="recap-big">{c.big}</b>
        <span className="muted">{c.text}</span>
        <span className="meta">{t('{i} of {n}', { i: i + 1, n: cards.length })}</span>
      </div>
      <div className="row g8 between">
        <Button icon={ChevronLeft} onClick={() => setI(x => Math.max(0, x - 1))} disabled={i === 0}>{t('Previous')}</Button>
        <Button variant="primary" iconEnd={ChevronRight} onClick={() => (i === cards.length - 1 ? close() : setI(x => x + 1))}>{i === cards.length - 1 ? t('Finish') : t('Next')}</Button>
      </div>
    </Dialog>
  );
}
