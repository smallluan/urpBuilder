import React, { useCallback, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useDebugStore, type TraceEntry } from './debugStore';
import type { PreviewDataHub } from '../runtime/dataHub';

/* ---------- JSON Tree ---------- */

const JsonValue: React.FC<{ value: unknown; depth?: number }> = ({ value, depth = 0 }) => {
  const [open, setOpen] = useState(depth < 2);

  if (value === null) return <span className="debug-json-null">null</span>;
  if (value === undefined) return <span className="debug-json-null">undefined</span>;
  if (typeof value === 'string') return <span className="debug-json-string">"{value}"</span>;
  if (typeof value === 'number') return <span className="debug-json-number">{String(value)}</span>;
  if (typeof value === 'boolean') return <span className="debug-json-boolean">{String(value)}</span>;

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="debug-json-null">{'[]'}</span>;
    return (
      <span>
        <span className="debug-json-toggle" onClick={() => setOpen(!open)}>
          {open ? <ChevronDown style={{ width: 12, height: 12, verticalAlign: -2 }} /> : <ChevronRight style={{ width: 12, height: 12, verticalAlign: -2 }} />}
        </span>
        {!open && <span className="debug-json-null">Array({value.length})</span>}
        {open && (
          <span style={{ display: 'block', paddingLeft: 16 }}>
            {value.map((item, idx) => (
              <span key={idx} style={{ display: 'block' }}>
                <span className="debug-json-key">{idx}</span>: <JsonValue value={item} depth={depth + 1} />
              </span>
            ))}
          </span>
        )}
      </span>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return <span className="debug-json-null">{'{}'}</span>;
    return (
      <span>
        <span className="debug-json-toggle" onClick={() => setOpen(!open)}>
          {open ? <ChevronDown style={{ width: 12, height: 12, verticalAlign: -2 }} /> : <ChevronRight style={{ width: 12, height: 12, verticalAlign: -2 }} />}
        </span>
        {!open && <span className="debug-json-null">{`{${entries.length} keys}`}</span>}
        {open && (
          <span style={{ display: 'block', paddingLeft: 16 }}>
            {entries.map(([k, v]) => (
              <span key={k} style={{ display: 'block' }}>
                <span className="debug-json-key">{k}</span>: <JsonValue value={v} depth={depth + 1} />
              </span>
            ))}
          </span>
        )}
      </span>
    );
  }

  return <span className="debug-json-null">{String(value)}</span>;
};

/* ---------- Event Summary ---------- */

const eventSummary = (event: unknown): string => {
  if (!event || typeof event !== 'object') return '-';
  const e = event as Record<string, unknown>;
  const kind = String(e.kind ?? '');
  switch (kind) {
    case 'lifecycle': return `lifecycle:${e.lifetime}`;
    case 'timer': return `timer (${e.intervalMs}ms)`;
    case 'patch': return 'patch';
    case 'value': return `value:${JSON.stringify(e.value)}`;
    case 'request:success': return `req:ok ${(e.request as Record<string, unknown>)?.status}`;
    case 'request:error': return `req:err`;
    default: return kind || '-';
  }
};

/* ---------- Component States Panel ---------- */

const ComponentStatesPanel: React.FC<{ dataHub: PreviewDataHub | null }> = ({ dataHub }) => {
  const [open, setOpen] = useState(false);
  const [states, setStates] = useState<Array<{ ref: string; key: string; label: string; type?: string; props: Record<string, unknown> }>>([]);
  const [expandedRef, setExpandedRef] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!dataHub) return;
    setStates(dataHub.getAllComponentStates());
  }, [dataHub]);

  return (
    <div className="debug-data-tab__section">
      <div className="debug-data-tab__section-header" onClick={() => { setOpen(!open); if (!open) refresh(); }}>
        {open ? <ChevronDown style={{ width: 12, height: 12 }} /> : <ChevronRight style={{ width: 12, height: 12 }} />}
        组件状态 ({states.length})
      </div>
      {open && (
        <div className="debug-component-states">
          {states.length === 0 && (
            <div style={{ padding: '8px 12px', color: '#6a6a6a' }}>暂无注册组件</div>
          )}
          {states.map((s) => (
            <div key={s.ref} className="debug-component-state-item">
              <div
                className="debug-component-state-item__header"
                onClick={() => setExpandedRef(expandedRef === s.ref ? null : s.ref)}
              >
                {expandedRef === s.ref
                  ? <ChevronDown style={{ width: 12, height: 12 }} />
                  : <ChevronRight style={{ width: 12, height: 12 }} />}
                <span className="debug-component-state-item__label">{s.label || s.key}</span>
                <span className="debug-component-state-item__type">{s.type}</span>
              </div>
              {expandedRef === s.ref && (
                <div className="debug-component-state-item__props">
                  <JsonValue value={s.props} depth={0} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ---------- Main Data Tab ---------- */

interface DebugDataTabProps {
  dataHub: PreviewDataHub | null;
}

const DebugDataTab: React.FC<DebugDataTabProps> = ({ dataHub }) => {
  const traceEntries = useDebugStore((s) => s.traceEntries);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedEntry = useMemo(
    () => traceEntries.find((e) => e.id === selectedId) ?? null,
    [traceEntries, selectedId],
  );

  return (
    <div className="debug-data-tab">
      <ComponentStatesPanel dataHub={dataHub} />
      <div className="debug-data-tab__trace">
        <table className="debug-trace-table">
          <thead>
            <tr>
              <th>#</th>
              <th>节点</th>
              <th>类型</th>
              <th>输入</th>
              <th>输出</th>
              <th>耗时</th>
            </tr>
          </thead>
          <tbody>
            {traceEntries.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#6a6a6a', padding: 16 }}>
                  暂无执行记录。触发组件交互后此处将显示流程图执行轨迹。
                </td>
              </tr>
            )}
            {traceEntries.map((entry, idx) => (
              <tr
                key={entry.id}
                className={selectedId === entry.id ? 'is-selected' : ''}
                onClick={() => setSelectedId(selectedId === entry.id ? null : entry.id)}
              >
                <td>{idx + 1}</td>
                <td title={entry.nodeId}>{entry.nodeLabel}</td>
                <td>{entry.nodeType}</td>
                <td>{eventSummary(entry.inputEvent)}</td>
                <td>{entry.outputEvent ? eventSummary(entry.outputEvent) : <span style={{ color: '#6a6a6a' }}>blocked</span>}</td>
                <td>{entry.durationMs}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
        {selectedEntry && (
          <div className="debug-json-tree">
            <div style={{ marginBottom: 6, color: '#969696', fontWeight: 600 }}>输入事件</div>
            <JsonValue value={selectedEntry.inputEvent} depth={0} />
            {selectedEntry.outputEvent && (
              <>
                <div style={{ marginTop: 10, marginBottom: 6, color: '#969696', fontWeight: 600 }}>输出事件</div>
                <JsonValue value={selectedEntry.outputEvent} depth={0} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DebugDataTab;
