import { useState } from 'react';
import { Check } from 'lucide-react';
import { useT } from '@/i18n';
import { Button } from './Button';

/** Sticky unsaved-changes bar used by every settings form. `onSave` returns whether the save succeeded. */
export function SaveBar({ dirty, onSave, onDiscard, disabled }: { dirty: boolean; onSave: () => boolean | Promise<boolean>; onDiscard: () => void; disabled?: boolean }) {
  const t = useT();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const save = async () => { setSaving(true); const ok = await onSave(); setSaving(false); if (ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); } };
  return (
    <div className={`savebar ${dirty ? 'is-dirty' : ''}`} role="region" aria-label={t('Save changes')}>
      {dirty ? <span className="row g8"><span className="dirty-dot" aria-hidden="true" />{t('You have unsaved changes')}</span> : saved ? <span className="row g8 ok" role="status"><Check size={16} aria-hidden="true" />{t('Saved')}</span> : <span className="meta">{t('All changes saved')}</span>}
      <span className="grow" />
      <Button variant="ghost" onClick={onDiscard} disabled={!dirty || saving}>{t('Discard')}</Button>
      <Button variant="primary" onClick={save} disabled={!dirty || disabled} loading={saving}>{t('Save changes')}</Button>
    </div>
  );
}
