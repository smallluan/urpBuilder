import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Globe, Trash2 } from 'lucide-react';
import { useDebugStore } from './debugStore';

type FilterType = 'all' | 'errors' | 'requests';

const formatTime = (ts: number) => {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
};

const DebugConsoleTab: React.FC = () => {
  const errors = useDebugStore((s) => s.errors);
  const requests = useDebugStore((s) => s.requests);
  const clearErrors = useDebugStore((s) => s.clearErrors);
  const clearRequests = useDebugStore((s) => s.clearRequests);
  const [filter, setFilter] = useState<FilterType>('all');
  const listRef = useRef<HTMLDivElement>(null);

  const entries = useMemo(() => {
    const items: Array<{
      id: string;
      kind: 'error' | 'request';
      nodeId: string;
      message: string;
      timestamp: number;
      ok?: boolean;
    }> = [];

    if (filter === 'all' || filter === 'errors') {
      errors.forEach((e) => items.push({
        id: e.id,
        kind: 'error',
        nodeId: e.nodeId,
        message: e.message,
        timestamp: e.timestamp,
      }));
    }

    if (filter === 'all' || filter === 'requests') {
      requests.forEach((r) => items.push({
        id: r.id,
        kind: 'request',
        nodeId: r.nodeId,
        message: `${r.method} ${r.endpoint} → ${r.status ?? 'ERR'} (${r.durationMs}ms)`,
        timestamp: r.timestamp,
        ok: r.ok,
      }));
    }

    return items.sort((a, b) => a.timestamp - b.timestamp);
  }, [errors, requests, filter]);

  useEffect(() => {
    const el = listRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [entries.length]);

  return (
    <div className="debug-console-tab">
      <div className="debug-console-tab__toolbar">
        <select
          className="debug-console-tab__filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value as FilterType)}
        >
          <option value="all">全部</option>
          <option value="errors">错误</option>
          <option value="requests">网络请求</option>
        </select>
        <button
          type="button"
          className="debug-console-tab__clear"
          onClick={() => { clearErrors(); clearRequests(); }}
        >
          <Trash2 style={{ width: 11, height: 11, marginRight: 3, verticalAlign: -1 }} />
          清除
        </button>
      </div>
      <div className="debug-console-tab__list" ref={listRef}>
        {entries.length === 0 && (
          <div style={{ padding: '16px 12px', color: '#6a6a6a', textAlign: 'center' }}>
            暂无日志
          </div>
        )}
        {entries.map((entry) => {
          const cls = entry.kind === 'error'
            ? 'is-error'
            : entry.ok ? 'is-request-ok' : 'is-request-fail';
          return (
            <div key={entry.id} className={`debug-console-entry ${cls}`}>
              <span className="debug-console-entry__icon">
                {entry.kind === 'error' ? <AlertCircle /> : <Globe />}
              </span>
              <span className="debug-console-entry__time">{formatTime(entry.timestamp)}</span>
              <span className="debug-console-entry__node">{entry.nodeId}</span>
              <span className="debug-console-entry__message">{entry.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DebugConsoleTab;
