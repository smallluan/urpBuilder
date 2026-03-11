export interface ApiAlertPayload {
  id: string;
  theme?: 'success' | 'error';
  message: string;
  detail?: string;
}

const API_ALERT_EVENT = 'urp:api-alert';

const createAlertId = () => `api-alert-${Date.now()}-${Math.round(Math.random() * 10000)}`;

export const emitApiAlert = (message: string, detail?: string, theme: ApiAlertPayload['theme'] = 'error') => {
  if (typeof window === 'undefined') {
    return;
  }

  const payload: ApiAlertPayload = {
    id: createAlertId(),
    theme,
    message,
    detail,
  };

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

  window.addEventListener(API_ALERT_EVENT, handler);

  return () => {
    window.removeEventListener(API_ALERT_EVENT, handler);
  };
};
