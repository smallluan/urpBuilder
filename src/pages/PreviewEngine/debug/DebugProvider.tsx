import React, { createContext, useContext, useEffect, useRef } from 'react';
import type { PreviewDataHub } from '../runtime/dataHub';
import { useDebugStore } from './debugStore';

interface DebugContextValue {
  enabled: boolean;
  dataHubRef: React.MutableRefObject<PreviewDataHub | null>;
}

const DebugContext = createContext<DebugContextValue>({
  enabled: false,
  dataHubRef: { current: null },
});

export const useDebugContext = () => useContext(DebugContext);

interface DebugProviderProps {
  enabled: boolean;
  dataHub: PreviewDataHub | null;
  children: React.ReactNode;
}

export const DebugProvider: React.FC<DebugProviderProps> = ({ enabled, dataHub, children }) => {
  const dataHubRef = useRef<PreviewDataHub | null>(dataHub);
  dataHubRef.current = dataHub;

  useEffect(() => {
    if (!enabled || !dataHub) return;

    const unsubError = dataHub.subscribe('runtime:error', (payload: unknown) => {
      const p = payload as { nodeId?: string; message?: string } | undefined;
      useDebugStore.getState()._addError({
        id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        nodeId: String(p?.nodeId ?? ''),
        message: String(p?.message ?? 'Unknown error'),
        timestamp: Date.now(),
      });
    });

    const unsubReq = dataHub.subscribe('runtime:request', (payload: unknown) => {
      const p = payload as {
        nodeId?: string;
        method?: string;
        endpoint?: string;
        status?: number;
        ok?: boolean;
        durationMs?: number;
      } | undefined;
      useDebugStore.getState()._addRequest({
        id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        nodeId: String(p?.nodeId ?? ''),
        method: String(p?.method ?? ''),
        endpoint: String(p?.endpoint ?? ''),
        status: typeof p?.status === 'number' ? p.status : undefined,
        durationMs: typeof p?.durationMs === 'number' ? p.durationMs : 0,
        ok: Boolean(p?.ok),
        timestamp: Date.now(),
      });
    });

    return () => {
      unsubError();
      unsubReq();
    };
  }, [enabled, dataHub]);

  useEffect(() => {
    if (!enabled) return;
    return () => {
      const state = useDebugStore.getState();
      state._clearPaused();
      state.clearTrace();
    };
  }, [enabled]);

  const value = React.useMemo<DebugContextValue>(
    () => ({ enabled, dataHubRef }),
    [enabled],
  );

  return (
    <DebugContext.Provider value={value}>
      {children}
    </DebugContext.Provider>
  );
};
