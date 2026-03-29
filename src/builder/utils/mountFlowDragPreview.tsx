import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import EventFilterNode from '../flow/nodes/EventFilterNode';
import CodeNode from '../flow/nodes/CodeNode';
import NetworkRequestNode from '../flow/nodes/NetworkRequestNode';
import TimerNode from '../flow/nodes/TimerNode';
import PropExposeNode from '../flow/nodes/PropExposeNode';
import LifecycleExposeNode from '../flow/nodes/LifecycleExposeNode';
import ComponentFlowNode from '../flow/nodes/ComponentFlowNode';

const suppress = { __suppressFlowActions: true as const };

function mockNodeProps(partial: Record<string, unknown>) {
  return {
    id: '__builder-drag-preview',
    selected: false,
    ...partial,
  } as Record<string, unknown>;
}

const BUILTIN_MAP: Record<string, React.ComponentType<any>> = {
  eventFilterNode: EventFilterNode,
  codeNode: CodeNode,
  networkRequestNode: NetworkRequestNode,
  timerNode: TimerNode,
  propExposeNode: PropExposeNode,
  lifecycleExposeNode: LifecycleExposeNode,
};

export function mountFlowBuiltinDragPreview(host: HTMLElement, nodeType: string, title: string): boolean {
  const Comp = BUILTIN_MAP[nodeType];
  if (!Comp) {
    return false;
  }

  const shell = document.createElement('div');
  shell.className = 'builder-flow-drag-preview-shell';
  host.appendChild(shell);

  const root = createRoot(shell);
  (host as HTMLElement & { __dragReactRoot?: Root }).__dragReactRoot = root;

  const dataMap: Record<string, Record<string, unknown>> = {
    eventFilterNode: { label: title, selectedLifetimes: [], ...suppress },
    codeNode: { label: title, language: 'javascript', note: '注释信息', ...suppress },
    networkRequestNode: { label: title, method: 'GET', endpoint: '/api/example', ...suppress },
    timerNode: { label: title, intervalMs: 1000, ...suppress },
    propExposeNode: {
      label: title,
      sourceLabel: '未连接组件节点',
      selectedPropKeys: [],
      selectedMappings: [],
      ...suppress,
    },
    lifecycleExposeNode: {
      label: title,
      upstreamLabel: '未连接事件过滤节点',
      selectedLifetimes: [],
      ...suppress,
    },
  };

  const data = dataMap[nodeType] ?? { label: title, ...suppress };

  try {
    flushSync(() => {
      root.render(<Comp {...(mockNodeProps({ type: nodeType, data }) as any)} />);
    });
  } catch {
    root.unmount();
    shell.remove();
    delete (host as HTMLElement & { __dragReactRoot?: Root }).__dragReactRoot;
    return false;
  }

  return shell.offsetHeight > 2;
}

export function mountFlowComponentDragPreview(host: HTMLElement, title: string, componentType: string): boolean {
  const shell = document.createElement('div');
  shell.className = 'builder-flow-drag-preview-shell';
  host.appendChild(shell);

  const root = createRoot(shell);
  (host as HTMLElement & { __dragReactRoot?: Root }).__dragReactRoot = root;

  try {
    flushSync(() => {
      root.render(
        <ComponentFlowNode
          {...(mockNodeProps({
            type: 'componentNode',
            data: {
              label: title,
              componentType,
              sourceKey: 'preview',
              sourceRef: 'root::preview',
              lifetimes: [],
              ...suppress,
            },
          }) as any)}
        />,
      );
    });
  } catch {
    root.unmount();
    shell.remove();
    delete (host as HTMLElement & { __dragReactRoot?: Root }).__dragReactRoot;
    return false;
  }

  return shell.offsetHeight > 2;
}
