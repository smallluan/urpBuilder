import { useEffect, useRef, useState } from 'react';
import { onApiAlert, type ApiAlertPayload } from './alertBus';

type ActiveAlert = ApiAlertPayload & {
  expiresAt: number;
};

const ALERT_DURATION = 4500;
const MAX_ALERTS = 4;

const themeStyleMap: Record<NonNullable<ApiAlertPayload['theme']>, { border: string; title: string; bg: string }> = {
  success: { border: '#2ba471', title: '#0f5132', bg: '#f2fff8' },
  error: { border: '#d54941', title: '#7f1d1d', bg: '#fff5f5' },
  warning: { border: '#ed7b2f', title: '#7c2d12', bg: '#fff9f2' },
  info: { border: '#2f6bde', title: '#1e3a8a', bg: '#f4f8ff' },
};

function ApiAlertHost() {
  const [alerts, setAlerts] = useState<ActiveAlert[]>([]);
  const timersRef = useRef<Record<string, number>>({});

  const removeAlert = (id: string) => {
    const timer = timersRef.current[id];
    if (timer) {
      window.clearTimeout(timer);
      delete timersRef.current[id];
    }

    setAlerts((previous) => previous.filter((item) => item.id !== id));
  };

  useEffect(() => {
    const cleanup = onApiAlert((payload) => {
      const nextAlert: ActiveAlert = {
        ...payload,
        expiresAt: Date.now() + ALERT_DURATION,
      };

      setAlerts((previous) => [nextAlert, ...previous].slice(0, MAX_ALERTS));

      const timer = window.setTimeout(() => {
        removeAlert(nextAlert.id);
      }, ALERT_DURATION);

      timersRef.current[nextAlert.id] = timer;
    });

    return () => {
      Object.values(timersRef.current).forEach((timer) => {
        window.clearTimeout(timer);
      });
      timersRef.current = {};
      cleanup();
    };
  }, []);

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        width: 360,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 999999,
      }}
    >
      {alerts.map((alert) => {
        const theme = alert.theme || 'error';
        const styleToken = themeStyleMap[theme];
        const detail = alert.detail?.trim();
        const isMessageChannel = alert.channel === 'message';
        const content = isMessageChannel
          ? (detail ? `${alert.message}：${detail}` : alert.message)
          : (detail || undefined);

        return (
          <div
            key={alert.id}
            style={{
              border: `1px solid ${styleToken.border}`,
              backgroundColor: styleToken.bg,
              borderRadius: 8,
              padding: '10px 12px',
              boxShadow: '0 8px 20px rgba(15, 23, 42, 0.12)',
              color: '#1f2937',
              display: 'flex',
              gap: 8,
              alignItems: 'flex-start',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: styleToken.title, fontWeight: 600, fontSize: 14, lineHeight: '20px' }}>
                {alert.message}
              </div>
              {content ? (
                <div style={{ marginTop: 4, fontSize: 13, lineHeight: '18px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {content}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => removeAlert(alert.id)}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: '#6b7280',
                fontSize: 16,
                lineHeight: '16px',
                padding: 0,
              }}
              aria-label="close"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default ApiAlertHost;
