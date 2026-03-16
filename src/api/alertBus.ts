export interface ApiAlertPayload {
  id: string;
  theme?: 'success' | 'error' | 'warning' | 'info';
  channel?: 'notification' | 'message';
  message: string;
  detail?: string;
}

const API_ALERT_EVENT = 'urp:api-alert';
const pendingAlerts: ApiAlertPayload[] = [];
let subscriberCount = 0;

const createAlertId = () => `api-alert-${Date.now()}-${Math.round(Math.random() * 10000)}`;

export const emitApiAlert = (
  message: string,
  detail?: string,
  theme: ApiAlertPayload['theme'] = 'error',
  channel: ApiAlertPayload['channel'] = 'message',
) => {
  if (typeof window === 'undefined') {
    return;
  }

  const payload: ApiAlertPayload = {
    id: createAlertId(),
    theme,
    channel,
    message,
    detail,
  };

  if (subscriberCount === 0) {
    pendingAlerts.push(payload);
  }

  window.dispatchEvent(new CustomEvent<ApiAlertPayload>(API_ALERT_EVENT, { detail: payload }));
};

export const onApiAlert = (listener: (payload: ApiAlertPayload) => void) => {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<ApiAlertPayload>;
    if (customEvent.detail) {
      listener(customEvent.detail);
    }
  };

  subscriberCount += 1;
  window.addEventListener(API_ALERT_EVENT, handler as EventListener);

  if (pendingAlerts.length) {
    const queue = [...pendingAlerts];
    pendingAlerts.length = 0;
    queue.forEach((payload) => listener(payload));
  }

  return () => {
    subscriberCount = Math.max(0, subscriberCount - 1);
    window.removeEventListener(API_ALERT_EVENT, handler as EventListener);
  };
};
