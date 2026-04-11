import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { computePosition, flip, offset, shift } from '@floating-ui/dom';
import { Input, MessagePlugin, Row, Space, Tree, Typography } from 'tdesign-react';
import type { TreeInstanceFunctions } from 'tdesign-react';
import { SearchIcon } from 'tdesign-icons-react';
import { FolderTree } from 'lucide-react';
import DragableWrapper from '../../components/DragableWrapper';
import { applyBuilderDragPreview } from '../utils/dragPreview';
import { useBuilderAccess, useBuilderContext } from '../context/BuilderContext';
import type { UiTreeInstance, UiTreeNode } from '../store/types';
import { isSlotNode } from '../utils/slot';
import type { FlowComponentDragPayload } from '../../types/flow';
import { BUILDER_STRUCTURE_TREE_SCROLL } from '../config/builderStructureTreeScroll';
import { isTdesignTreeExpandIconClick } from '../utils/treeExpandIconClick';
import { findFirstFlowNodeIdBySourceKey, getFlowNodeStructureSourceKey } from '../utils/flowNodeSourceKey';
import { findNodePathByKey } from '../utils/tree';
import StructureVirtualRootBanner from './StructureVirtualRootBanner';
import {
  isVirtualStructureRootKeyValid,
  resolveStructureDisplayRoot,
} from '../utils/structureTreeVirtualRoot';

const { Text } = Typography;

interface RenderUiTreeNode extends Omit<UiTreeNode, 'label' | 'children'> {
  label: React.ReactNode;
  children?: RenderUiTreeNode[];
}

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || target.isContentEditable;
};

const FlowAsideLeft: React.FC = () => {
  const { useStore } = useBuilderContext();
  const { readOnly } = useBuilderAccess();
  const uiPageData = useStore((state) => state.uiPageData);
  const builderLeftAsideWidthPx = useStore((state) => state.builderFlowLeftAsideWidthPx);
  const builderLeftAsideCollapsed = useStore((state) => state.builderFlowLeftAsideCollapsed);
  const flowActiveNodeId = useStore((state) => state.flowActiveNodeId);
  const flowActiveStructureKey = useStore((state) => {
    const id = state.flowActiveNodeId;
    if (!id) {
      return null as string | null;
    }
    const node = state.flowNodes.find((n) => n.id === id);
    return node ? getFlowNodeStructureSourceKey(node) : null;
  });
  const setFlowActiveNodeId = useStore((state) => state.setFlowActiveNodeId);
  const setFlowStructureTreeInstance = useStore((state) => state.setFlowStructureTreeInstance);

  const [virtualStructureRootKey, setVirtualStructureRootKey] = useState<string | null>(null);
  const [contextMenuState, setContextMenuState] = useState<{
    visible: boolean;
    nodeKey: string | null;
    x: number;
    y: number;
  }>({
    visible: false,
    nodeKey: null,
    x: 0,
    y: 0,
  });
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const contextMenuAnchorRef = useRef<{ x: number; y: number } | null>(null);

  const treeRef = useRef<TreeInstanceFunctions<any>>(null);

  const displayRoot = useMemo(
    () => resolveStructureDisplayRoot(uiPageData, virtualStructureRootKey),
    [uiPageData, virtualStructureRootKey],
  );

  useEffect(() => {
    if (virtualStructureRootKey && !isVirtualStructureRootKeyValid(uiPageData, virtualStructureRootKey)) {
      setVirtualStructureRootKey(null);
    }
  }, [uiPageData, virtualStructureRootKey]);

  const flowTreeActivedKeys = useMemo(
    () => (flowActiveStructureKey ? [flowActiveStructureKey] : ([] as string[])),
    [flowActiveStructureKey],
  );

  const closeContextMenu = () => {
    contextMenuAnchorRef.current = null;
    setContextMenuState((previous) => {
      if (!previous.visible) {
        return previous;
      }
      return {
        ...previous,
        visible: false,
        nodeKey: null,
      };
    });
  };

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent<HTMLDivElement>, nodeKey: string) => {
      if (readOnly) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      contextMenuAnchorRef.current = {
        x: event.clientX,
        y: event.clientY,
      };
      setContextMenuState({
        visible: true,
        nodeKey,
        x: event.clientX,
        y: event.clientY,
      });
    },
    [readOnly],
  );

  const contextMenuNode = useMemo(() => {
    if (!contextMenuState.nodeKey) {
      return null;
    }
    const path = findNodePathByKey(uiPageData, contextMenuState.nodeKey);
    if (!path?.length) {
      return null;
    }
    return path[path.length - 1];
  }, [contextMenuState.nodeKey, uiPageData]);

  const canShowAsVirtualRoot = Boolean(contextMenuNode && contextMenuNode.key !== uiPageData.key);

  const getMenuItemStyle = (enabled: boolean): React.CSSProperties => ({
    opacity: enabled ? 1 : 0.45,
    pointerEvents: enabled ? 'auto' : 'none',
  });

  const handleDragStart = useCallback((event: React.DragEvent<HTMLDivElement>, node: UiTreeNode) => {
    if (isSlotNode(node)) {
      return;
    }

    const payload: FlowComponentDragPayload = {
      kind: 'component-node',
      name: String(node.label ?? '节点'),
      componentType: String(node.type ?? 'Unknown'),
      sourceKey: node.key,
      sourceRef: `root::${node.key}`,
      lifetimes: Array.isArray(node.lifetimes) ? node.lifetimes : [],
    };

    applyBuilderDragPreview(event, {
      kind: 'flow-component',
      title: String(node.label ?? '节点'),
      componentType: String(node.type ?? ''),
    });
    event.dataTransfer?.setData('drag-component-data', JSON.stringify(payload));
    event.dataTransfer.effectAllowed = 'copy';
  }, []);

  const flowTreeData = useMemo(() => {
    const transformNode = (node: UiTreeNode): RenderUiTreeNode => {
      const children = Array.isArray(node.children) ? node.children.map((child) => transformNode(child)) : [];

      return {
        ...node,
        label: isSlotNode(node) ? (
          <div className="tree-node-label" onContextMenu={(e) => handleNodeContextMenu(e, node.key)}>
            <div className="tree-node-item">
              <span className="tree-node-item__title">{String(node.label ?? '插槽')}</span>
            </div>
          </div>
        ) : (
          <DragableWrapper data={node} onDragStart={handleDragStart}>
            <div className="tree-node-label" onContextMenu={(e) => handleNodeContextMenu(e, node.key)}>
              <div className="tree-node-item">
                <span className="tree-node-item__title">{String(node.label ?? '节点')}</span>
              </div>
            </div>
          </DragableWrapper>
        ),
        children,
      };
    };

    return [transformNode(displayRoot)];
  }, [displayRoot, handleDragStart, handleNodeContextMenu]);

  const handleTreeClick = (context: any) => {
    const key = context?.node?.value ?? context?.node?.key;
    if (typeof key !== 'string') {
      return;
    }
    if (isTdesignTreeExpandIconClick(context?.e)) {
      return;
    }

    const flowNodeId = findFirstFlowNodeIdBySourceKey(useStore.getState().flowNodes, key);
    if (!flowNodeId) {
      void MessagePlugin.info('当前结构节点未在流程图中放置为组件/属性暴露节点');
      return;
    }
    setFlowActiveNodeId(flowNodeId);
  };

  useEffect(() => {
    setFlowStructureTreeInstance(treeRef.current as unknown as UiTreeInstance);
    return () => setFlowStructureTreeInstance(null);
  }, [setFlowStructureTreeInstance]);

  useEffect(() => {
    if (!contextMenuState.visible) {
      return;
    }
    const handleWindowMouseDown = (event: MouseEvent) => {
      if (contextMenuRef.current?.contains(event.target as globalThis.Node | null)) {
        return;
      }
      closeContextMenu();
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeContextMenu();
      }
    };
    window.addEventListener('mousedown', handleWindowMouseDown);
    window.addEventListener('keydown', handleEscape);
    window.addEventListener('resize', closeContextMenu);
    return () => {
      window.removeEventListener('mousedown', handleWindowMouseDown);
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('resize', closeContextMenu);
    };
  }, [contextMenuState.visible]);

  useLayoutEffect(() => {
    if (!contextMenuState.visible) {
      return;
    }
    const menuElement = contextMenuRef.current;
    const anchor = contextMenuAnchorRef.current;
    if (!menuElement || !anchor) {
      return;
    }
    const anchorX = anchor.x;
    const anchorY = anchor.y;
    const virtualAnchor = {
      getBoundingClientRect: () => DOMRect.fromRect({ x: anchorX, y: anchorY, width: 0, height: 0 }),
    };
    void computePosition(virtualAnchor, menuElement, {
      strategy: 'fixed',
      placement: 'right-start',
      middleware: [offset(4), flip({ padding: 8 }), shift({ padding: 8 })],
    }).then(({ x, y }) => {
      setContextMenuState((previous) => {
        if (!previous.visible || previous.x !== anchorX || previous.y !== anchorY) {
          return previous;
        }
        return { ...previous, x, y };
      });
    });
  }, [contextMenuState.visible]);

  useEffect(() => {
    if (readOnly) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      const withCmd = event.ctrlKey || event.metaKey;
      if (!withCmd || isEditableTarget(event.target)) {
        return;
      }
      if (event.key.toLowerCase() !== 'r' || event.shiftKey || !event.altKey) {
        return;
      }

      const vKey = virtualStructureRootKey?.trim() || null;
      if (vKey) {
        event.preventDefault();
        event.stopPropagation();
        setVirtualStructureRootKey(null);
        return;
      }

      const node = flowActiveNodeId
        ? useStore.getState().flowNodes.find((n) => n.id === flowActiveNodeId)
        : null;
      const sk = node ? getFlowNodeStructureSourceKey(node) : null;
      if (sk && sk !== uiPageData.key) {
        event.preventDefault();
        event.stopPropagation();
        setVirtualStructureRootKey(sk);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flowActiveNodeId, readOnly, uiPageData.key, useStore, virtualStructureRootKey]);

  const asideStyle = useMemo((): React.CSSProperties => {
    if (builderLeftAsideCollapsed) {
      return { width: 0, minWidth: 0, flexShrink: 0 };
    }
    return { width: builderLeftAsideWidthPx, minWidth: 0, maxWidth: 300, flexShrink: 0 };
  }, [builderLeftAsideCollapsed, builderLeftAsideWidthPx]);

  return (
    <aside
      className={`aside-left${builderLeftAsideCollapsed ? ' aside-left--collapsed' : ''}`}
      style={asideStyle}
    >
      <div className="structure-top">
        <div className="structure-panel">
          <div className="structure-title">
            <div className="structure-title__main">结构节点</div>
          </div>

          <div className="search-row">
            <Input placeholder="搜索流程节点（示例）" clearable suffix={<SearchIcon />} />
          </div>

          <StructureVirtualRootBanner
            visible={Boolean(virtualStructureRootKey && virtualStructureRootKey !== uiPageData.key)}
            rootLabel={String(displayRoot.label ?? displayRoot.key)}
            onClear={() => setVirtualStructureRootKey(null)}
          />

          <div className="structure-tree" role="tree">
            <div className="structure-tree__zoom">
              <Tree
                keys={{ value: 'key' }}
                ref={treeRef}
                activable
                expandAll
                line
                scroll={BUILDER_STRUCTURE_TREE_SCROLL}
                data={flowTreeData}
                actived={flowTreeActivedKeys}
                onClick={handleTreeClick}
              />
            </div>
          </div>

          {contextMenuState.visible && contextMenuNode ? (
            <div
              ref={contextMenuRef}
              className="tree-node-context-menu"
              style={{ left: contextMenuState.x, top: contextMenuState.y }}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div
                style={getMenuItemStyle(canShowAsVirtualRoot)}
                onClick={() => {
                  if (!canShowAsVirtualRoot || !contextMenuNode) {
                    return;
                  }
                  setVirtualStructureRootKey(contextMenuNode.key);
                  closeContextMenu();
                }}
              >
                <Row className="tree-node-context-menu-item" justify="space-between" align="center">
                  <Space style={{ alignItems: 'center' }} size={12} align="center">
                    <FolderTree size={16} strokeWidth={2} />
                    <Text>展示为根节点</Text>
                  </Space>
                </Row>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
};

export default React.memo(FlowAsideLeft);
