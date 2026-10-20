/** Ghar mark: a simple house outline with a doorway. Decorative; the parent supplies the accessible name. */
export function GharMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false" className="ghar-mark">
      <rect width="32" height="32" rx="16" fill="var(--raise)" stroke="var(--line)" />
      <path d="M9 15.4 16 9.4l7 6V23.2a.8.8 0 0 1-.8.8h-3.6v-4.6a2.6 2.6 0 0 0-5.2 0v4.6H9.8a.8.8 0 0 1-.8-.8z" fill="none" stroke="var(--tx)" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}
