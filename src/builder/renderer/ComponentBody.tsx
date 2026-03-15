import React, { useEffect, useMemo, useRef, useState } from 'react';
import cloneDeep from 'lodash/cloneDeep';
import { Button, MessagePlugin } from 'tdesign-react';
import { Palette, PlusSquare, Trash2 } from 'lucide-react';
import { useBuilderContext } from '../context/BuilderContext';
import DropArea from '../../components/DropArea';
import { LIST_TEMPLATE_ALLOWED_TYPES } from '../../constants/componentBuilder';
import { findNodePathByKey } from '../utils/tree';
import NodeStyleDrawer from '../components/NodeStyleDrawer';
import componentCatalog from '../../config/componentCatalog';
import { isSlotNode } from '../utils/slot';

const GRID_COL_COMPONENT_SCHEMA = componentCatalog.find((item) => item.type === 'Grid.Col');

const ComponentBody: React.FC = () => {
  const { useStore } = useBuilderContext();
  const screenSize = useStore((state) => state.screenSize);
  const autoWidth = useStore((state) => state.autoWidth);
  const uiPageData = useStore((state) => state.uiPageData);
  const activeNodeKey = useStore((state) => state.activeNodeKey);
  const setActiveNode = useStore((state) => state.setActiveNode);
  const removeFromUiPageData = useStore((state) => state.removeFromUiPageData);
  const insertToUiPageData = useStore((state) => state.insertToUiPageData);
  const updateActiveNodeProp = useStore((state) => state.updateActiveNodeProp);
  const hiddenHintKeyRef = useRef<string | null>(null);
  const pulseCleanupRef = useRef<(() => void) | null>(null);
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

  const closeContextMenu = () => {
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

  // 组件拖拽后接收结构化数据，并插入到对应父节点下
  const handleDropData = (data: any, parent: any, options?: { slotKey?: string }) => {
    if (!parent?.key || !data || typeof data !== 'object') {
      return;
    }

    const droppedType = typeof data.type === 'string' ? data.type.trim() : '';
    const parentType = typeof parent.type === 'string' ? parent.type.trim() : '';
    const menuNodeTypes = new Set(['Menu.Submenu', 'Menu.Item']);
    const menuContainerTypes = new Set(['Menu', 'HeadMenu', 'Menu.Submenu']);

    if (parentType === 'Steps' && droppedType !== 'Steps.Item') {
      return;
    }

    if (droppedType === 'Steps.Item' && parentType !== 'Steps') {
      return;
    }

    if (parentType === 'HeadMenu' && !menuNodeTypes.has(droppedType)) {
      return;
    }

    if (parentType === 'Menu' && !menuNodeTypes.has(droppedType)) {
      return;
    }

    if (parentType === 'Menu.Submenu' && !menuNodeTypes.has(droppedType)) {
      return;
    }

    if (parentType === 'Menu.Group') {
      return;
    }

    if (droppedType === 'Menu.Group') {
      return;
    }

    if (menuNodeTypes.has(droppedType) && !menuContainerTypes.has(parentType)) {
      return;
    }

    if (parentType === 'List.Item') {
      const parentPath = findNodePathByKey(uiPageData, String(parent.key));
      const listAncestor = parentPath?.slice().reverse().find((item) => item.type === 'List');
      const customModeEnabled =
        !!listAncestor
        && Boolean((listAncestor.props?.customTemplateEnabled as { value?: unknown } | undefined)?.value);

      if (customModeEnabled && !LIST_TEMPLATE_ALLOWED_TYPES.has(droppedType)) {
        return;
      }
    }

    insertToUiPageData(parent.key, data as Record<string, unknown>, options?.slotKey);
    setTimeout(() => {
      console.log(useStore.getState().uiPageData);
    }, 0);
  };

  const simulatorStyle: React.CSSProperties = useMemo(() => {
    const width = screenSize === 'auto' ? `${autoWidth}px` : `${screenSize}px`;
    return {
      width,
      height: '100%',
      backgroundColor: '#fff',
      margin: '0 auto',
      transition: 'width 0.3s ease',
      boxSizing: 'content-box', // Ensure border doesn't eat into width if strict specific
      display: 'flex',
      overflow: 'auto',
      position: 'relative'
    };
  }, [screenSize, autoWidth]);

  useEffect(() => {
    if (!activeNodeKey) {
      hiddenHintKeyRef.current = null;
      return;
    }

    const activePath = findNodePathByKey(uiPageData, activeNodeKey);
    const activeNode = activePath?.[activePath.length - 1];
    if (!activeNode) {
      return;
    }

    const isHidden = ((activeNode.props?.visible as { value?: unknown } | undefined)?.value) === false;
    if (isHidden) {
      if (hiddenHintKeyRef.current !== activeNodeKey) {
        MessagePlugin.info(`组件“${activeNode.label || activeNode.key}”当前为隐藏状态，请先开启 visible`);
        hiddenHintKeyRef.current = activeNodeKey;
      }
      return;
    }

    hiddenHintKeyRef.current = null;

    const safeKey = typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
      ? CSS.escape(activeNodeKey)
      : activeNodeKey.replace(/"/g, '\\"');
    const target = document.querySelector<HTMLElement>(`[data-builder-node-key="${safeKey}"]`);
    if (!target) {
      return;
    }

    if (pulseCleanupRef.current) {
      pulseCleanupRef.current();
      pulseCleanupRef.current = null;
    }

    target.classList.remove('builder-node-anchor--pulse');
    void target.offsetWidth;
    target.classList.add('builder-node-anchor--pulse');

    const handlePulseAnimationEnd = () => {
      target.classList.remove('builder-node-anchor--pulse');
      target.removeEventListener('animationend', handlePulseAnimationEnd);
      if (pulseCleanupRef.current === cleanupPulse) {
        pulseCleanupRef.current = null;
      }
    };

    const cleanupPulse = () => {
      target.classList.remove('builder-node-anchor--pulse');
      target.removeEventListener('animationend', handlePulseAnimationEnd);
    };

    pulseCleanupRef.current = cleanupPulse;
    target.addEventListener('animationend', handlePulseAnimationEnd);

    const simulatorContainer = document.querySelector<HTMLElement>('[data-builder-scroll-container="true"]');
    if (!simulatorContainer) {
      target.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
      return;
    }

    const targetRect = target.getBoundingClientRect();
    const containerRect = simulatorContainer.getBoundingClientRect();
    const outsideViewport =
      targetRect.top < containerRect.top
      || targetRect.bottom > containerRect.bottom
      || targetRect.left < containerRect.left
      || targetRect.right > containerRect.right;

    if (outsideViewport) {
      target.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
    }
  }, [activeNodeKey]);

  useEffect(() => {
    return () => {
      if (pulseCleanupRef.current) {
        pulseCleanupRef.current();
        pulseCleanupRef.current = null;
      }
    };
  }, []);

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

  const handleDeleteNode = (nodeKey: string) => {
    if (!nodeKey || nodeKey === uiPageData.key || !contextMenuNode || isSlotNode(contextMenuNode)) {
      closeContextMenu();
      return;
    }

    removeFromUiPageData(nodeKey);
    closeContextMenu();
  };

  const handleCanvasContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    const targetElement = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-builder-node-key]');
    const nodeKey = targetElement?.dataset.builderNodeKey;
    if (!nodeKey) {
      closeContextMenu();
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setActiveNode(nodeKey);

    const menuWidth = 190;
    const menuHeight = 132;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const x = Math.max(8, Math.min(event.clientX, viewportWidth - menuWidth - 8));
    const y = Math.max(8, Math.min(event.clientY, viewportHeight - menuHeight - 8));

    setContextMenuState({
      visible: true,
      nodeKey,
      x,
      y,
    });
  };

  useEffect(() => {
    if (!contextMenuState.visible) {
      return;
    }

    const handleWindowMouseDown = (event: MouseEvent) => {
      if (contextMenuRef.current?.contains(event.target as Node)) {
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

  return (
    <div className="component-body">
      <div className="simulator-container" data-builder-scroll-container="true" style={simulatorStyle} onContextMenu={handleCanvasContextMenu}>
        <DropArea
          className="drop-area-root"
          style={{ minHeight: '100%', height: 'auto', flex: '0 0 auto' }}
          data={uiPageData}
          onDropData={handleDropData}
          selectable={false}
        />

        {contextMenuState.visible && contextMenuNode ? (
          <div
            ref={contextMenuRef}
            className="tree-node-context-menu"
            style={{ left: contextMenuState.x, top: contextMenuState.y }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <NodeStyleDrawer
              targetKey={contextMenuNode.key}
              value={(contextMenuNode.props?.__style as { value?: Record<string, unknown> } | undefined)?.value}
              onChange={(nextStyle) => {
                setActiveNode(contextMenuNode.key);
                updateActiveNodeProp('__style', nextStyle);
              }}
              triggerRenderer={(openDrawer) => (
                <Button
                  size="small"
                  variant="text"
                  theme="default"
                  className="tree-node-context-action"
                  icon={<Palette size={14} />}
                  onClick={() => {
                    setActiveNode(contextMenuNode.key);
                    closeContextMenu();
                    openDrawer();
                  }}
                >
                  样式配置
                </Button>
              )}
            />

            {contextMenuNode.type === 'Grid.Row' ? (
              <Button
                size="small"
                variant="text"
                theme="default"
                className="tree-node-context-action"
                icon={<PlusSquare size={14} />}
                onClick={() => {
                  if (!GRID_COL_COMPONENT_SCHEMA) {
                    return;
                  }

                  insertToUiPageData(contextMenuNode.key, cloneDeep(GRID_COL_COMPONENT_SCHEMA) as Record<string, unknown>);
                  setActiveNode(contextMenuNode.key);
                  closeContextMenu();
                }}
              >
                添加栅格列
              </Button>
            ) : null}

            <Button
              size="small"
              variant="text"
              theme="danger"
              className="tree-node-context-action tree-node-context-action--danger"
              icon={<Trash2 size={14} />}
              disabled={contextMenuNode.key === uiPageData.key || isSlotNode(contextMenuNode)}
              onClick={() => handleDeleteNode(contextMenuNode.key)}
            >
              删除该节点
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ComponentBody;
