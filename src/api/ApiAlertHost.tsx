import { useEffect, useState } from 'react';
import { Alert } from 'tdesign-react';
import { onApiAlert, type ApiAlertPayload } from './alertBus';

const AUTO_CLOSE_MS = 5000;

function ApiAlertHost() {
  const [alerts, setAlerts] = useState<ApiAlertPayload[]>([]);

  useEffect(() => {
    const unsubscribe = onApiAlert((payload) => {
      setAlerts((previous) => [payload, ...previous].slice(0, 3));

      window.setTimeout(() => {
        setAlerts((previous) => previous.filter((item) => item.id !== payload.id));
      }, AUTO_CLOSE_MS);
    });

    return unsubscribe;
  }, []);

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        right: 16,
        top: 16,
        width: 360,
        zIndex: 9999,
      }}
    >
      {alerts.map((alert) => (
        <div key={alert.id} style={{ marginBottom: 8 }}>
          <Alert
            theme={alert.theme || 'error'}
            title={alert.message}
            message={alert.detail}
            close
            onClose={() => {
              setAlerts((previous) => previous.filter((item) => item.id !== alert.id));
            }}
          />
        </div>
      ))}
    </div>
  );
}

export default ApiAlertHost;
