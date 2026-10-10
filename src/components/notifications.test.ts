import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  notifyWhenPageInactive,
  requestTimerNotificationPermission,
} from './notifications';

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

describe('timer notifications', () => {
  beforeEach(() => {
    notifications.length = 0;
    NotificationMock.permission = 'default';
    NotificationMock.requestPermission.mockReset();
    vi.stubGlobal('Notification', NotificationMock);
    vi.stubGlobal('window', window);
    vi.stubGlobal('document', document);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('requests permission when it has not already been granted or denied', async () => {
    NotificationMock.requestPermission.mockResolvedValue('granted');

    await expect(requestTimerNotificationPermission()).resolves.toBe('granted');
    expect(NotificationMock.requestPermission).toHaveBeenCalledOnce();
  });

  it('preserves the default result when the permission prompt is dismissed', async () => {
    NotificationMock.requestPermission.mockResolvedValue('default');

    await expect(requestTimerNotificationPermission()).resolves.toBe('default');
  });

  it('does not request permission again when it is already granted or denied', async () => {
    NotificationMock.permission = 'granted';
    await expect(requestTimerNotificationPermission()).resolves.toBe('granted');

    NotificationMock.permission = 'denied';
    await expect(requestTimerNotificationPermission()).resolves.toBe('denied');
    expect(NotificationMock.requestPermission).not.toHaveBeenCalled();
  });

  it('does not notify while the page is visible and focused', () => {
    NotificationMock.permission = 'granted';
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });

    expect(notifyWhenPageInactive('Pomodoro timer', 'Focus complete')).toBe('active');
    expect(notifications).toHaveLength(0);
  });

  it('notifies when the page is visible but unfocused', () => {
    NotificationMock.permission = 'granted';
    vi.spyOn(document, 'hasFocus').mockReturnValue(false);
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });

    expect(notifyWhenPageInactive('Pomodoro timer', 'Focus complete')).toBe('shown');
    expect(notifications).toHaveLength(1);
  });

  it('notifies when the page is hidden even if the browser reports focus', () => {
    NotificationMock.permission = 'granted';
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });

    expect(notifyWhenPageInactive('Pomodoro timer', 'Focus complete')).toBe('shown');
    expect(notifications).toEqual([
      { title: 'Pomodoro timer', options: { body: 'Focus complete' } },
    ]);
  });

  it('does not notify when permission has not been granted', () => {
    expect(notifyWhenPageInactive('Pomodoro timer', 'Focus complete')).toBe('denied');
    expect(notifications).toHaveLength(0);
  });

  it('reports an error if the browser fails to create the notification', () => {
    NotificationMock.permission = 'granted';
    vi.spyOn(document, 'hasFocus').mockReturnValue(false);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal(
      'Notification',
      class {
        static permission: NotificationPermission = 'granted';

        constructor() {
          throw new Error('Notification could not be shown');
        }
      },
    );

    expect(notifyWhenPageInactive('Pomodoro timer', 'Focus complete')).toBe('error');
    expect(console.error).toHaveBeenCalledOnce();
  });
});
