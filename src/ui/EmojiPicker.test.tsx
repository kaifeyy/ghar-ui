import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import type { CustomEmoji } from '@/types/models';
import type { EmojiPickerSelection } from './EmojiPicker';
import { EmojiPicker } from './EmojiPicker';

const CUSTOM_EMOJI: CustomEmoji[] = [{ id: 'e1', name: 'spark', art: { kind: 'glyph', glyph: '✨', color: '#ffffff' }, by: 'me' }];
const STICKERS: CustomEmoji[] = [{ id: 's1', name: 'High five', art: { kind: 'glyph', glyph: '🙌', color: '#ffffff' }, by: 'me' }];

function PickerHarness() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [picked, setPicked] = useState('');
  return <>
    <button type="button" aria-expanded={!!anchor} onClick={e => setAnchor(e.currentTarget)}>Open picker</button>
    <output data-testid="picked">{picked}</output>
    <EmojiPicker open={!!anchor} anchor={anchor} onClose={() => setAnchor(null)} onSelect={(selection: EmojiPickerSelection) => setPicked(selection.kind === 'unicode' ? selection.emoji : selection.kind === 'custom' ? `:${selection.emoji.name}:` : selection.sticker.name)} customEmoji={CUSTOM_EMOJI} stickers={STICKERS} />
  </>;
}

describe('EmojiPicker', () => {
  it('searches the catalog and returns the selected emoji', () => {
    render(<PickerHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open picker' }));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search emoji', hidden: true }), { target: { value: 'cat' } });
    fireEvent.click(document.querySelector<HTMLButtonElement>('.emoji-option')!);
    expect(screen.getByTestId('picked').textContent).toBe('🐈');
    expect(screen.getByRole('button', { name: 'Open picker' }).getAttribute('aria-expanded')).toBe('false');
  });

  it('offers community emoji and stickers in their own categories', () => {
    render(<PickerHarness />);
    const trigger = screen.getByRole('button', { name: 'Open picker' });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('tab', { name: 'Community emoji', hidden: true }));
    fireEvent.click(document.querySelector<HTMLButtonElement>('.emoji-option')!);
    expect(screen.getByTestId('picked').textContent).toBe(':spark:');
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('tab', { name: 'Stickers', hidden: true }));
    fireEvent.click(document.querySelector<HTMLButtonElement>('.emoji-option')!);
    expect(screen.getByTestId('picked').textContent).toBe('High five');
  });

  it('closes on Escape and returns focus to its trigger', () => {
    render(<PickerHarness />);
    const trigger = screen.getByRole('button', { name: 'Open picker' });
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole('searchbox', { name: 'Search emoji', hidden: true }), { key: 'Escape' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });
});
