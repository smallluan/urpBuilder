import type { Edge, Node } from '@xyflow/react';
import type { ComponentTemplateContent } from '../../api/types';
import type { ScreenSize, UiTreeNode } from '../store/types';
import { createBuilderStore } from '../store/createBuilderStore';
import { normalizeUiTreeLegacyAntdTypes } from '../utils/normalizeUiTreeLegacyAntd';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/** 与编辑器一致：桌面 auto 宽度、固定屏宽等从 pageConfig 还原，避免 JSON 里数字以字符串存储时丢失 */
function resolveCompareScreenEnv(pc: Record<string, unknown>): { screenSize: ScreenSize; autoWidth: number } {
  const rawW = pc.autoWidth;
  let autoWidth = 1200;
  if (typeof rawW === 'number' && Number.isFinite(rawW)) {
    autoWidth = Math.round(rawW);
  } else if (typeof rawW === 'string' && rawW.trim()) {
    const n = Number(rawW);
    if (Number.isFinite(n)) {
      autoWidth = Math.round(n);
    }
  }
  autoWidth = clamp(autoWidth, 280, 4096);

  const rawS = pc.screenSize;
  let screenSize: ScreenSize = 'auto';
  if (rawS === undefined || rawS === null || rawS === 'auto') {
    screenSize = 'auto';
  } else if (typeof rawS === 'number' && Number.isFinite(rawS)) {
    screenSize = clamp(Math.round(rawS), 280, 4096);
  } else if (typeof rawS === 'string') {
    const t = rawS.trim();
    if (t === '' || t === 'auto') {
      screenSize = 'auto';
    } else {
      const n = Number(t);
      if (Number.isFinite(n)) {
        screenSize = clamp(Math.round(n), 280, 4096);
      } else {
        screenSize = rawS;
      }
    }
  }

  return { screenSize, autoWidth };
}

/**
 * 为版本对比页创建独立搭建 store（仅内存，不写服务端）。
 */
export function createCompareBuilderStore(template: ComponentTemplateContent) {
  const useStore = createBuilderStore({});
  const tree = normalizeUiTreeLegacyAntdTypes(template.uiTree as unknown as UiTreeNode);
  const pc = (template.pageConfig ?? {}) as Record<string, unknown>;
  const previewLib =
    (pc as { previewUiLibrary?: string }).previewUiLibrary === 'antd' ? 'antd' : 'tdesign';
  const { screenSize, autoWidth } = resolveCompareScreenEnv(pc);

  useStore.setState({
    uiPageData: tree,
    flowNodes: (template.flowNodes ?? []) as Node[],
    flowEdges: (template.flowEdges ?? []) as Edge[],
    screenSize,
    autoWidth,
    previewUiLibrary: previewLib,
    selectedLayoutTemplateId: (pc.selectedLayoutTemplateId as never) ?? null,
    activeNodeKey: null,
    activeNode: null,
    flowActiveNodeId: null,
  });

  return useStore;
}
