import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/** Local editable copy of saved settings with dirty tracking. Re-syncs when the saved value changes and nothing is being edited. */
export function useDraft<T>(saved: T) {
  const [draft, setDraft] = useState<T>(() => structuredClone(saved));
  const savedJson = JSON.stringify(saved);
  const prevSaved = useRef(savedJson);
  const dirty = useMemo(() => JSON.stringify(draft) !== savedJson, [draft, savedJson]);
  useEffect(() => {
    if (prevSaved.current !== savedJson) { prevSaved.current = savedJson; setDraft(structuredClone(saved)); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedJson]);
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);
  const patch = useCallback((p: Partial<T>) => setDraft(d => ({ ...d, ...p })), []);
  const reset = useCallback(() => setDraft(structuredClone(saved)), [savedJson]); // eslint-disable-line react-hooks/exhaustive-deps
  return { draft, setDraft, patch, dirty, reset };
}
