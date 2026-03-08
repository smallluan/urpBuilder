import React, { useEffect, useMemo, useRef, useState } from 'react';
import cloneDeep from 'lodash/cloneDeep';
import { Button, Input, Popup, Tree } from 'tdesign-react';
import type { TreeInstanceFunctions } from 'tdesign-react';
import { SearchIcon } from 'tdesign-icons-react';
import { useCreateComponentStore } from '../store';
import type { UiTreeNode } from '../store/type';
import ComponentConfigPanel from './ComponentConfigPanel';
import NodeStyleDrawer from './NodeStyleDrawer';

interface RenderUiTreeNode extends Omit<UiTreeNode, 'label' | 'children'> {
  label: React.ReactNode;
  children?: RenderUiTreeNode[];
}

const ComponentAsideLeft: React.FC = () => {
  const uiPageData = useCreateComponentStore((state) => state.uiPageData);
  const setTreeInstance = useCreateComponentStore((state) => state.setTreeInstance);
  const activeNodeKey = useCreateComponentStore((state) => state.activeNodeKey);
  const setActiveNode = useCreateComponentStore((state) => state.setActiveNode);
  const toggleActiveNode = useCreateComponentStore((state) => state.toggleActiveNode);
  const removeFromUiPageData = useCreateComponentStore((state) => state.removeFromUiPageData);
  const updateActiveNodeProp = useCreateComponentStore((state) => state.updateActiveNodeProp);
  const [contextMenuState, setContextMenuState] = useState<{
    visible: boolean;
    nodeKey: string | null;
  }>({
    visible: false,
    nodeKey: null,
  });

  const closeContextMenu = () => {
    setContextMenuState((previous) => {
      if (!previous.visible) {
        return previous;
      }

      return {
        ...previous,
        visible: false,
      };
    });
  };

  const handlePopupVisibleChange = (visible: boolean, nodeKey: string) => {
    if (visible) {
      setContextMenuState({
        visible: true,
        nodeKey,
      });
      return;
    }

    setContextMenuState((previous) => {
      if (!previous.visible || previous.nodeKey !== nodeKey) {
        return previous;
      }

      return {
        visible: false,
        nodeKey: null,
      };
    });
  };

  const handleNodeContextMenu = (event: React.MouseEvent<HTMLDivElement>, nodeKey: string) => {
    event.preventDefault();
    event.stopPropagation();
    setActiveNode(nodeKey);
    setContextMenuState({
      visible: true,
      nodeKey,
    });
  };

  const handleDeleteNode = (nodeKey: string) => {
    if (!nodeKey || nodeKey === uiPageData.key) {
      closeContextMenu();
      return;
    }

    removeFromUiPageData(nodeKey);
    closeContextMenu();
  };

  const uiPageDataWithWrappedLabel = useMemo(() => {
    const cloned = cloneDeep(uiPageData) as UiTreeNode;

    const transformNode = (node: UiTreeNode): RenderUiTreeNode => {
      const children = Array.isArray(node.children)
        ? node.children.map((child) => transformNode(child))
        : [];

      return {
        ...node,
        label: typeof node.label === 'string' ? (
          <Popup
            visible={contextMenuState.visible && contextMenuState.nodeKey === node.key}
            trigger="context-menu"
            placement="right-top"
            destroyOnClose={false}
            showArrow={false}
            onVisibleChange={(visible) => handlePopupVisibleChange(visible, node.key)}
            content={
              <div className="tree-node-context-popup-content" onMouseDown={(event) => event.stopPropagation()}>
                <NodeStyleDrawer
                  targetKey={node.key}
                  value={(node.props?.__style as { value?: Record<string, unknown> } | undefined)?.value}
                  onChange={(nextStyle) => {
                    setActiveNode(node.key);
                    updateActiveNodeProp('__style', nextStyle);
                  }}
                  triggerRenderer={(openDrawer) => (
                    <Button
                      size="small"
                      variant="text"
                      theme="default"
                      className="tree-node-context-action"
                      onClick={() => {
                        setActiveNode(node.key);
                        closeContextMenu();
                        openDrawer();
                      }}
                    >
                      样式配置
                    </Button>
                  )}
                />
                <Button
                  size="small"
                  variant="base"
                  theme="default"
                  className="tree-node-context-action"
                  disabled={node.key === uiPageData.key}
                  onClick={() => handleDeleteNode(node.key)}
                >
                  删除该节点
                </Button>
              </div>
            }
          >
            <div
              className="tree-node-label"
              onContextMenu={(event) => handleNodeContextMenu(event, node.key)}
            >
              {node.label}
            </div>
          </Popup>
        ) : node.label,
        children,
      };
    };

    return transformNode(cloned);
  }, [contextMenuState.nodeKey, contextMenuState.visible, uiPageData]);

  const treeData = useMemo(() => [uiPageDataWithWrappedLabel], [uiPageDataWithWrappedLabel]);
  const treeRef = useRef<TreeInstanceFunctions<any>>(null);

  const handleTreeClick = (context: any) => {
    const key = context?.node?.value ?? context?.node?.key;
    if (typeof key !== 'string') {
      return;
    }
    toggleActiveNode(key);
  };

  useEffect(() => {
    setTreeInstance(treeRef.current);
    return () => setTreeInstance(null);
  }, [setTreeInstance]);

  return (
    <aside className="aside-left">
      <div className="structure-top">
        <div className="structure-panel">
          <div className="search-row">
            <Input placeholder="搜索组件（示例）" clearable suffix={<SearchIcon />} />
          </div>

          <div className="structure-tree" role="tree">
            <Tree
              keys={{ value: 'key' }}
              ref={treeRef}
              activable
              expandAll
              line
              data={treeData}
              actived={activeNodeKey ? [activeNodeKey] : []}
              onClick={handleTreeClick}
            />
          </div>
        </div>
      </div>

      <div className="structure-bottom">
        <ComponentConfigPanel />
      </div>
    </aside>
  );
};

export default React.memo(ComponentAsideLeft);
