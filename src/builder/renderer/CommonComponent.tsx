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
  applyInstanceSlotsToTemplate,
  applyExposedPropsToTemplate,
  cloneTemplateUiTree,
  getNodeStringProp,
  loadCustomComponentDetail,
  namespaceUiTreeKeys,
} from '../../utils/customComponentRuntime';

/**
 * CommonComponent：Builder 运行时的“组件渲染分发器”。
 *
 * 输入：UiTreeNode（搭建器存储的组件树节点）+ type
 * 输出：对应组件的 React 元素（或 null）
 *
 * 这里统一处理的 editor 级能力：
 * - 激活/选中：activeNodeKey（以及自定义组件内部的“激活归属锁定”）
 * - 样式：从 props.__style 解析并与 registry 内样式合并
 * - 可见性：visible=false 的节点默认不渲染（Drawer 例外）
 * - 插槽：slot 节点 / slot outlet 渲染为 DropArea 承接拖拽
 * - 自定义组件运行时：根据 __componentId 拉取模板 uiTree，应用 exposed props/slots 后递归渲染
 *
 * 内置组件渲染由 registry(Map) 驱动（见 src/builder/renderer/registries/*）。
 */

interface CommonComponentProps {
  type?: string;
  data?: UiTreeNode;
  onDropData?: UiDropDataHandler;
  activationOwnerKey?: string;
  lockActivationToOwner?: boolean;
}

/**
 * CustomComponent 运行时渲染器（“组件自生长”的落点）。
 *
 * CustomComponent 实例节点只携带：
 * - __componentId：指向后端存储的模板
 * - exposed props：对外暴露的配置（会映射回模板树内部的真实 prop）
 * - slots：实例插槽内容（会注入到模板 slot outlet）
 *
 * 渲染流程：
 * 1) 拉取 detail（缓存由 customComponentRuntime 管理）
 * 2) clone 模板树，避免污染 detail
 * 3) 应用 exposed props（instance -> template）
 * 4) 应用实例 slots（instance -> template）
 * 5) namespace key，避免与画布其它节点 key 冲突（同一模板多实例尤其需要）
 * 6) 递归渲染模板树的 children（注意：不会渲染模板 root 本身）
 */
const BuilderCustomComponentRenderer: React.FC<{ node: UiTreeNode; onDropData?: UiDropDataHandler }> = ({ node, onDropData }) => {
  const [templateTree, setTemplateTree] = React.useState<UiTreeNode | null>(null);
  const [loading, setLoading] = React.useState(false);

  const componentId = getNodeStringProp(node, '__componentId');
  const componentVersion = React.useMemo(() => {
    const raw = (node.props?.__componentVersion as { value?: unknown } | undefined)?.value;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
  }, [node.props?.__componentVersion]);

  React.useEffect(() => {
    let cancelled = false;

    if (!componentId) {
      setTemplateTree(null);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    void loadCustomComponentDetail(componentId, { version: componentVersion })
      .then((detail) => {
        if (cancelled) {
          return;
        }

        const root = cloneTemplateUiTree(detail);
        if (!root) {
          setTemplateTree(null);
          return;
        }

        const exposedPatchedTree = applyExposedPropsToTemplate(node, root, detail);
        const slotPatchedTree = applyInstanceSlotsToTemplate(node, exposedPatchedTree);
        const namespaced = namespaceUiTreeKeys(slotPatchedTree, `cc-${node.key}`);
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
  }, [componentId, componentVersion, node]);

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
          onDropData={onDropData}
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
  const updateActiveNodeProp = useStore((state) => state.updateActiveNodeProp);
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

  /**
   * 激活归属：
   * - 普通节点：激活 key = 自身 data.key
   * - 自定义组件内部递归渲染的子节点：可通过 lockActivationToOwner 把激活归属锁定到外层 CustomComponent 实例，
   *   避免“点内部节点导致选中跳走/DropArea 写入错误归属”等编辑器体验问题。
   */
  const resolvedActivationKey = lockActivationToOwner
    ? (activationOwnerKey || data?.key || '')
    : (data?.key || '');
  const isNodeActive = useStore((state) => (
    !!resolvedActivationKey && state.activeNodeKey === resolvedActivationKey
  ));

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
  const ownerDropDataHandler = React.useMemo<UiDropDataHandler | undefined>(() => {
    if (!lockActivationToOwner || !activationOwnerKey || !onDropData) {
      return onDropData;
    }

    return (dropData, _parent, options) => {
      const slotKey = options?.slotKey;
      if (!slotKey) {
        return;
      }

      // 自定义组件内部 slot 的写入，应该落到外层 CustomComponent 实例节点上（由运行时把 slots 注回模板）。
      onDropData(dropData, { key: activationOwnerKey, type: 'CustomComponent' } as UiTreeNode, { slotKey });
    };
  }, [activationOwnerKey, lockActivationToOwner, onDropData]);

  // Early returns
  if (isSlotNode(data)) {
    const slotKey = getNodeSlotKey(data);
    return (
      <DropArea
        data={data}
        onDropData={ownerDropDataHandler}
        dropSlotKey={slotKey}
        emptyText="拖拽组件到此插槽"
        disabled={lockActivationToOwner && !slotKey}
        selectable={!lockActivationToOwner}
      />
    );
  }

  if (normalizedType === 'ComponentSlotOutlet') {
    const slotKey = getStringProp('slotKey') || 'default';
    return (
      <DropArea
        data={data}
        onDropData={ownerDropDataHandler}
        dropSlotKey={slotKey}
        emptyText={getStringProp('emptyText') || '拖拽组件到此插槽'}
        disabled={lockActivationToOwner && !slotKey}
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
        <BuilderCustomComponentRenderer node={data as UiTreeNode} onDropData={onDropData} />
      </div>
    );
  }

  const visible = getBooleanProp('visible');
  const isDrawerNode = normalizedType === 'Drawer';
  // Drawer 需要允许在“不可见”时依旧保留节点渲染入口（由组件自身处理打开/关闭与挂载策略）。
  if (visible === false && !isDrawerNode) return null;

  // ctx 是 renderer 的统一输入协议：把 node 数据、事件、编辑器能力、以及部分组件的预解析 props 打包给 registry renderer。
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
    updateActiveNodeProp,
  };

  const renderer = registry.get(normalizedType ?? '');
  return renderer ? renderer(ctx) : null;
}
