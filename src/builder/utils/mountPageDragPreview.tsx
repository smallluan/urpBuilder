import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { BuilderProvider, type BuilderContextValue } from '../context/BuilderContext';
import CommonComponent from '../renderer/CommonComponent';
import { toUiTreeNode } from '../../utils/createComponentTree';
import { CHART_COMPONENT_TYPE_MAP } from '../../constants/echart';

const ECHART_TYPE_NAMES = new Set(Object.keys(CHART_COMPONENT_TYPE_MAP));

export function shouldUseStaticPageDragPreview(componentType: string): boolean {
  const t = String(componentType ?? '').trim();
  if (!t) {
    return true;
  }
  if (t === 'CustomComponent') {
    return true;
  }
  if (t === 'BackTop' || t === 'Drawer') {
    return true;
  }
  if (ECHART_TYPE_NAMES.has(t) || t.startsWith('ECharts.')) {
    return true;
  }
  return false;
}

export function mountBuilderPageDragPreview(
  host: HTMLElement,
  catalogData: Record<string, unknown>,
  ctx: BuilderContextValue,
): boolean {
  let node;
  try {
    node = toUiTreeNode(catalogData);
  } catch {
    return false;
  }

  const shell = document.createElement('div');
  shell.className = 'builder-page-drag-preview-shell';
  host.appendChild(shell);

  const root = createRoot(shell);
  (host as HTMLElement & { __dragReactRoot?: Root }).__dragReactRoot = root;

  try {
    flushSync(() => {
      root.render(
        <BuilderProvider
          useStore={ctx.useStore}
          readOnly={ctx.readOnly}
          readOnlyReason={ctx.readOnlyReason}
          entityType={ctx.entityType}
        >
          <CommonComponent type={node.type} data={node} onDropData={() => {}} />
        </BuilderProvider>,
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

export function teardownDragPreviewReactRoot(host: HTMLElement): void {
  const r = (host as HTMLElement & { __dragReactRoot?: Root }).__dragReactRoot;
  if (r) {
    try {
      r.unmount();
    } catch {
      /* noop */
    }
    delete (host as HTMLElement & { __dragReactRoot?: Root }).__dragReactRoot;
  }
}
