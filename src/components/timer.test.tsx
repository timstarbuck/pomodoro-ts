import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

const workerInstances: WorkerMock[] = [];
const notifications: Array<{ title: string; options?: NotificationOptions }> = [];

class NotificationMock {
  static permission: NotificationPermission = 'default';
  static requestPermission = vi.fn<() => Promise<NotificationPermission>>();

  constructor(
    public title: string,
    public options?: NotificationOptions,
  ) {
    notifications.push({ title, options });
  }
}

class WorkerMock {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onmessage: ((ev: any) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();

  constructor() {
    workerInstances.push(this);
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
global.Worker = WorkerMock as any;

describe('Timer Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    workerInstances.length = 0;
    notifications.length = 0;
    NotificationMock.permission = 'default';
    NotificationMock.requestPermission.mockReset();
    vi.stubGlobal('Notification', NotificationMock);
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
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
    expect(workerInstances[0].postMessage).toHaveBeenCalledWith({ command: 'start', interval: 1000 });
  });

  it('does not start the worker until the timer starts', () => {
    render(<Timer />);
    expect(workerInstances[0].postMessage).not.toHaveBeenCalledWith({ command: 'start', interval: 1000 });
  });

  it('pauses timer on button click when running', () => {
    render(<Timer />);
    const startBtn = screen.getByRole('button', { name: /Start Focus/ });
    fireEvent.click(startBtn); // Start
    fireEvent.click(startBtn); // Pause
    expect(startBtn.textContent).toContain('Resume Focus');
  });

  it('restarts session when restart icon is clicked', () => {
    render(<Timer focusLength={10} />);
    const restartBtn = screen.getByLabelText('Restart Session');
    fireEvent.click(restartBtn);
    expect(screen.getByText('00:10')).toBeInTheDocument();
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

  it('enables notifications only after the user grants permission', async () => {
    NotificationMock.requestPermission.mockResolvedValue('granted');
    render(<Timer />);

    fireEvent.click(screen.getByRole('button', { name: 'Enable notifications' }));

    expect(await screen.findByRole('button', { name: 'Disable notifications' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(NotificationMock.requestPermission).toHaveBeenCalledOnce();
  });

  it('shows notification capability and permission errors to the user', async () => {
    vi.stubGlobal('Notification', undefined);
    const { unmount } = render(<Timer />);
    fireEvent.click(screen.getByRole('button', { name: 'Enable notifications' }));
    expect(await screen.findByText('Notifications are not supported by this browser.')).toBeInTheDocument();
    unmount();

    vi.stubGlobal('Notification', NotificationMock);
    NotificationMock.requestPermission.mockResolvedValue('denied');
    render(<Timer />);
    fireEvent.click(screen.getByRole('button', { name: 'Enable notifications' }));
    expect(
      await screen.findByText('Notifications are blocked. Change your browser permission to enable them.'),
    ).toBeInTheDocument();
  });

  it('notifies on natural completion only when the page is inactive', async () => {
    NotificationMock.permission = 'granted';
    NotificationMock.requestPermission.mockResolvedValue('granted');
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    vi.spyOn(document, 'hasFocus').mockReturnValue(false);

    render(<Timer focusLength={0} />);
    fireEvent.click(screen.getByRole('button', { name: 'Enable notifications' }));
    await screen.findByRole('button', { name: 'Disable notifications' });
    fireEvent.click(screen.getByRole('button', { name: 'Start Focus' }));

    expect(notifications).toEqual([
      { title: 'Pomodoro Timer', options: { body: 'Focus session complete.' } },
    ]);
  });

  it('notifies for a naturally completed break as well as a focus session', async () => {
    NotificationMock.permission = 'granted';
    NotificationMock.requestPermission.mockResolvedValue('granted');
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    vi.spyOn(document, 'hasFocus').mockReturnValue(false);

    render(<Timer focusLength={0} shortBreakLength={0} focusSessions={2} />);
    fireEvent.click(screen.getByRole('button', { name: 'Enable notifications' }));
    await screen.findByRole('button', { name: 'Disable notifications' });
    fireEvent.click(screen.getByRole('button', { name: 'Start Focus' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start Short Break' }));

    expect(notifications.map(({ options }) => options?.body)).toEqual([
      'Focus session complete.',
      'Short Break session complete.',
    ]);
  });

  it('does not notify for a session completed while the page is focused', async () => {
    NotificationMock.permission = 'granted';
    NotificationMock.requestPermission.mockResolvedValue('granted');
    render(<Timer focusLength={0} />);
    fireEvent.click(screen.getByRole('button', { name: 'Enable notifications' }));
    await screen.findByRole('button', { name: 'Disable notifications' });
    fireEvent.click(screen.getByRole('button', { name: 'Start Focus' }));

    expect(notifications).toHaveLength(0);
  });
});
