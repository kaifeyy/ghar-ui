import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { Select, DatePicker } from './Pickers';

function SelectHarness() {
  const [v, setV] = useState<'a' | 'b' | 'c'>('a');
  return <><Select label="Fruit" value={v} onValue={setV} options={[['a', 'Apple'], ['b', 'Banana'], ['c', 'Cherry']]} /><output data-testid="v">{v}</output></>;
}

describe('Select', () => {
  it('opens with the keyboard, moves with arrows, selects with Enter and returns focus', () => {
    render(<SelectHarness />);
    const trigger = screen.getByRole('combobox', { name: 'Fruit' });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const list = screen.getByRole('listbox', { hidden: true });
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    fireEvent.keyDown(list, { key: 'Enter' });
    expect(screen.getByTestId('v').textContent).toBe('c');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });
  it('marks the selected option and closes on Escape without changing the value', () => {
    render(<SelectHarness />);
    const trigger = screen.getByRole('combobox', { name: 'Fruit' });
    fireEvent.click(trigger);
    expect(screen.getByRole('option', { name: 'Apple', hidden: true }).getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(screen.getByRole('listbox', { hidden: true }), { key: 'Escape' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByTestId('v').textContent).toBe('a');
  });
});

describe('DatePicker', () => {
  it('disables days outside min/max and picks an allowed day', () => {
    const onChange = vi.fn();
    render(<DatePicker label="When" value="2026-10-15" min="2026-10-10" max="2026-10-20" onChange={onChange} />);
    act(() => { fireEvent.click(screen.getByLabelText('When')); });
    const day9 = screen.getAllByRole('button', { hidden: true }).find(b => b.textContent === '9' && b.classList.contains('cal-day'))!;
    const day18 = screen.getAllByRole('button', { hidden: true }).find(b => b.textContent === '18' && b.classList.contains('cal-day'))!;
    expect((day9 as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(day18);
    expect(onChange).toHaveBeenCalledWith('2026-10-18');
  });
});
