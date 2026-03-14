import React from 'react';
import DropArea from '../../components/DropArea';
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
import {
  applyExposedPropsToTemplate,
  cloneTemplateUiTree,
  getNodeStringProp,
  loadCustomComponentDetail,
  namespaceUiTreeKeys,
} from '../../utils/customComponentRuntime';

interface CommonComponentProps {
  type?: string;
  data?: UiTreeNode;
  onDropData?: UiDropDataHandler;
  activationOwnerKey?: string;
  lockActivationToOwner?: boolean;
}

const BuilderCustomComponentRenderer: React.FC<{ node: UiTreeNode }> = ({ node }) => {
  const [templateTree, setTemplateTree] = React.useState<UiTreeNode | null>(null);
  const [loading, setLoading] = React.useState(false);

  const componentId = getNodeStringProp(node, '__componentId');

  React.useEffect(() => {
    let cancelled = false;

    if (!componentId) {
      setTemplateTree(null);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    void loadCustomComponentDetail(componentId)
      .then((detail) => {
        if (cancelled) {
          return;
        }

        const root = cloneTemplateUiTree(detail);
        if (!root) {
          setTemplateTree(null);
          return;
        }

        const injectedTree = applyExposedPropsToTemplate(node, root, detail);
        const namespaced = namespaceUiTreeKeys(injectedTree, `cc-${node.key}`);
        setTemplateTree(namespaced);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [componentId, node]);

  if (!componentId) {
    return null;
  }

  if (loading) {
    return null;
  }

  if (!templateTree || (templateTree.children ?? []).length === 0) {
    return null;
  }

  return (
    <div className="builder-custom-component-runtime" data-custom-component-runtime>
      {(templateTree.children ?? []).map((child) => (
        <CommonComponent
          key={child.key}
          type={child.type}
          data={child}
          activationOwnerKey={node.key}
          lockActivationToOwner
        />
      ))}
    </div>
  );
};

export default function CommonComponent(properties: CommonComponentProps) {
  const { useStore } = useBuilderContext();
  const {
    type,
    data,
    onDropData,
    activationOwnerKey,
    lockActivationToOwner = false,
  } = properties;
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
  const resolvedActivationKey = lockActivationToOwner
    ? (activationOwnerKey || data?.key || '')
    : (data?.key || '');
  const isNodeActive = !!resolvedActivationKey && activeNodeKey === resolvedActivationKey;

  const mergeStyle = (baseStyle?: React.CSSProperties): React.CSSProperties | undefined => {
    if (!baseStyle && !inlineStyle) return undefined;
    return { ...(baseStyle ?? {}), ...(inlineStyle ?? {}) };
  };

  const handleActivateSelf = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    if (!resolvedActivationKey) return;
    setActiveNode(resolvedActivationKey);
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
    return (
      <DropArea
        data={data}
        onDropData={lockActivationToOwner ? undefined : onDropData}
        emptyText="拖拽组件到此插槽"
        disabled={lockActivationToOwner}
        selectable={!lockActivationToOwner}
      />
    );
  }

  if (normalizedType === 'CustomComponent') {
    return (
      <div
        className="builder-custom-component-runtime"
        style={mergeStyle()}
        onClick={handleActivateSelf}
        onClickCapture={(event) => {
          event.stopPropagation();
          if (data?.key) {
            setActiveNode(data.key);
          }
        }}
        data-builder-node-key={data?.key || undefined}
      >
        <BuilderCustomComponentRenderer node={data as UiTreeNode} />
      </div>
    );
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
