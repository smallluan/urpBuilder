import React from 'react';
import DropArea from '../../../components/DropArea';
import type { UiDropDataHandler, UiTreeNode } from '../store/types';
import type { ComponentRenderContext } from './componentContext';
import { useBuilderContext } from '../context/BuilderContext';
import { getNodeSlotKey, isSlotNode } from '../utils/slot';
import {
  normalizeResponsiveConfig,
  resolveBuilderViewportWidth,
  resolveResponsiveColLayout,
} from '../utils/gridResponsive';
import { createPropAccessors } from './propAccessors';
import { buildMenuNodesRenderer } from './componentHelpers';
import { registry } from './registries';

interface CommonComponentProps {
  type?: string;
  data?: UiTreeNode;
  onDropData?: UiDropDataHandler;
}

export default function CommonComponent(properties: CommonComponentProps) {
  const { useStore } = useBuilderContext();
  const { type, data, onDropData } = properties;
  const normalizedType = typeof type === 'string' ? type.trim() : type;
  const [tabsInnerValue, setTabsInnerValue] = React.useState<string | number | undefined>(undefined);
  const setActiveNode = useStore((state) => state.setActiveNode);
  const activeNodeKey = useStore((state) => state.activeNodeKey);
  const screenSize = useStore((state) => state.screenSize);
  const autoWidth = useStore((state) => state.autoWidth);

  const accessors = createPropAccessors(data);
  const { getStyleProp, getStringProp, getBooleanProp, getProp } = accessors;

  const renderBuilderMenuNodes = React.useMemo(
    () => buildMenuNodesRenderer(setActiveNode),
    [setActiveNode],
  );

  React.useEffect(() => {
    setTabsInnerValue(undefined);
  }, [data?.key]);

  const inlineStyle = getStyleProp();
  const isNodeActive = !!data?.key && activeNodeKey === data.key;

  const mergeStyle = (baseStyle?: React.CSSProperties): React.CSSProperties | undefined => {
    if (!baseStyle && !inlineStyle) return undefined;
    return { ...(baseStyle ?? {}), ...(inlineStyle ?? {}) };
  };

  const handleActivateSelf = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    if (!data?.key) return;
    setActiveNode(data.key);
  };

  // Space props
  const spaceDirection = getStringProp('direction') as 'horizontal' | 'vertical' | undefined;
  const isSpaceSplitEnabled = getBooleanProp('splitEnabled') === true;
  const spaceSplitLayout = spaceDirection === 'vertical' ? 'horizontal' : 'vertical';
  const spaceSplitContent = getStringProp('splitContent');
  const spaceSplitAlign = getStringProp('splitAlign') as any;
  const spaceSplitDashed = getBooleanProp('splitDashed');

  // Grid.Col props
  const toGridNumber = (value: unknown): number | undefined => {
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) return parsed;
    }
    return undefined;
  };
  const colSpan = (() => {
    const resolved = toGridNumber(getProp('span'));
    if (typeof resolved !== 'number') return 6;
    return Math.max(0, Math.min(12, Math.round(resolved)));
  })();
  const colOffset = (() => {
    const resolved = toGridNumber(getProp('offset'));
    if (typeof resolved !== 'number') return 0;
    return Math.max(0, Math.min(11, Math.round(resolved)));
  })();
  const responsiveConfig = normalizeResponsiveConfig(getProp('__responsiveCol'));
  const builderViewportWidth = resolveBuilderViewportWidth(screenSize, autoWidth);
  const responsiveColLayout = resolveResponsiveColLayout(colSpan, colOffset, responsiveConfig, builderViewportWidth);

  // Card slot nodes
  const getCardSlotNode = (slotKey: 'header' | 'body') =>
    (data?.children ?? []).find((child) => getNodeSlotKey(child) === slotKey);
  const cardHeaderSlotNode = getCardSlotNode('header');
  const cardBodySlotNode = getCardSlotNode('body');
  const hasCardSlotStructure = Boolean(cardHeaderSlotNode && cardBodySlotNode);

  // Early returns
  if (isSlotNode(data)) {
    return <DropArea data={data} onDropData={onDropData} emptyText="拖拽组件到此插槽" />;
  }
  const visible = getBooleanProp('visible');
  const isDrawerNode = normalizedType === 'Drawer';
  if (visible === false && !isDrawerNode) return null;

  const ctx: ComponentRenderContext = {
    data,
    onDropData,
    ...accessors,
    renderBuilderMenuNodes,
    mergeStyle,
    handleActivateSelf,
    isNodeActive,
    spaceDirection,
    isSpaceSplitEnabled,
    spaceSplitLayout,
    spaceSplitContent,
    spaceSplitAlign,
    spaceSplitDashed,
    responsiveColLayout,
    cardHeaderSlotNode,
    cardBodySlotNode,
    hasCardSlotStructure,
    tabsInnerValue,
    setTabsInnerValue,
    setActiveNode,
  };

  const renderer = registry.get(normalizedType ?? '');
  return renderer ? renderer(ctx) : null;
}
