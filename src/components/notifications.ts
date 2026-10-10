export type NotificationRequestResult = 'granted' | 'denied' | 'default' | 'unsupported';
export type NotificationDisplayResult = 'shown' | 'active' | 'denied' | 'unsupported' | 'error';

const isNotificationSupported = () =>
  typeof window !== 'undefined' && typeof Notification !== 'undefined';

export const requestTimerNotificationPermission = async (): Promise<NotificationRequestResult> => {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  return permission;
};

export const notifyWhenPageInactive = (title: string, body: string): NotificationDisplayResult => {
  if (!isNotificationSupported() || typeof document === 'undefined') {
    return 'unsupported';
  }

  if (Notification.permission !== 'granted') {
    return 'denied';
  }

  if (document.visibilityState !== 'hidden' && document.hasFocus()) {
    return 'active';
  }

  try {
    new Notification(title, { body });
    return 'shown';
  } catch (error) {
    console.error('Unable to display timer notification.', error);
    return 'error';
  }
};
