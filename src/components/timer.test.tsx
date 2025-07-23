import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import Timer, { SessionState } from './timer';
import '@testing-library/jest-dom';

// Enum tests (existing)
describe('SessionState Enum', () => {
  it('should have Focus, ShortBreak, and LongBreak values', () => {
    expect(SessionState.Focus).toBe('Focus');
    expect(SessionState.ShortBreak).toBe('Short Break');
    expect(SessionState.LongBreak).toBe('Long Break');
  });

  it('should have unique values', () => {
    const values = Object.values(SessionState);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });

  it('should match expected labels', () => {
    expect(SessionState.Focus).toEqual('Focus');
    expect(SessionState.ShortBreak).toEqual('Short Break');
    expect(SessionState.LongBreak).toEqual('Long Break');
  });
});

// Mock playSound and Worker
vi.mock('react-sounds', () => ({
  playSound: vi.fn(),
}));

class WorkerMock {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onmessage: ((ev: any) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
global.Worker = WorkerMock as any;

describe('Timer Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders initial time and session', () => {
    render(<Timer />);
    expect(screen.getByText('25:00')).toBeInTheDocument();
    expect(screen.getByText(/Focus Sessions: 1\/4/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start Focus/ })).toBeInTheDocument();
  });

  it('starts timer on button click', () => {
    render(<Timer />);
    const startBtn = screen.getByRole('button', { name: /Start Focus/ });
    fireEvent.click(startBtn);
    expect(startBtn.textContent).toContain('Pause Focus');
  });

  it('pauses timer on button click when running', () => {
    render(<Timer />);
    const startBtn = screen.getByRole('button', { name: /Start Focus/ });
    fireEvent.click(startBtn); // Start
    fireEvent.click(startBtn); // Pause
    expect(startBtn.textContent).toContain('Resume Focus');
  });

  it('restarts session when restart icon is clicked', () => {
    render(<Timer />);
    const restartBtn = screen.getByLabelText('Restart Session');
    fireEvent.click(restartBtn);
    expect(screen.getByText('25:00')).toBeInTheDocument();
    expect(screen.getByText(/Focus Sessions: 1\/4/)).toBeInTheDocument();
  });

  it('skips to next session when skip icon is clicked', () => {
    render(<Timer />);
    const skipBtn = screen.getByLabelText('Skip to the next break');
    fireEvent.click(skipBtn);
    expect(screen.getByText('05:00')).toBeInTheDocument(); // Short break
    expect(screen.getByText('Short Break')).toBeInTheDocument();
  });

  it('displays correct button text for each timer state', () => {
    render(<Timer />);
    const buttons = screen.getAllByRole('button');
    const btn = buttons.find((btn) => btn.textContent?.includes('Start Focus'));
    expect(btn).toBeDefined();
    expect(btn?.textContent).toContain('Start Focus');
    if (btn) fireEvent.click(btn);
    expect(btn?.textContent).toContain('Pause Focus');
    if (btn) fireEvent.click(btn);
    expect(btn?.textContent).toContain('Resume Focus');
  });
});
