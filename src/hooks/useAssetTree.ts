import { useCallback, useMemo, useRef, useState } from 'react';
import { listNodeChildren } from '../api/assetNodes';
import type { MediaNodeDTO, MediaNodeScope } from '../api/types';

interface TreeNodeState {
  expanded: boolean;
  loading: boolean;
  loaded: boolean;
  children: MediaNodeDTO[];
}

/**
 * 素材树状态管理（懒加载）
 *
 * 使用 useRef 保存 nodeMap 的最新引用，确保所有回调函数引用稳定（不因 nodeMap 变化而重建），
 * 避免消费端 useEffect 依赖回调时触发无限循环。
 */
export function useAssetTree(scope: MediaNodeScope, teamId: string | undefined) {
  const [nodeMap, setNodeMap] = useState<Map<string, TreeNodeState>>(new Map());
  const nodeMapRef = useRef(nodeMap);
  nodeMapRef.current = nodeMap;

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const updateNodeMap = useCallback(
    (updater: (prev: Map<string, TreeNodeState>) => Map<string, TreeNodeState>) => {
      setNodeMap((prev) => {
        const next = updater(prev);
        nodeMapRef.current = next;
        return next;
      });
    },
    [],
  );

  const isExpanded = useCallback((nodeId: string) => {
    return nodeMapRef.current.get(nodeId)?.expanded ?? false;
  }, []);

  const isLoading = useCallback((nodeId: string) => {
    return nodeMapRef.current.get(nodeId)?.loading ?? false;
  }, []);

  const getChildren = useCallback((nodeId: string) => {
    return nodeMapRef.current.get(nodeId)?.children || [];
  }, []);

  const toggleExpand = useCallback(
    async (node: MediaNodeDTO) => {
      const current = nodeMapRef.current.get(node.id);
      const willExpand = !(current?.expanded ?? false);

      updateNodeMap((prev) => {
        const next = new Map(prev);
        next.set(node.id, {
          ...(current || { children: [], loaded: false, loading: false }),
          expanded: willExpand,
        });
        return next;
      });

      if (willExpand && node.kind === 'folder' && !current?.loaded) {
        updateNodeMap((prev) => {
          const next = new Map(prev);
          const c = prev.get(node.id);
          next.set(node.id, {
            ...(c || { children: [], loaded: false, expanded: true }),
            loading: true,
          });
          return next;
        });

        try {
          const res = await listNodeChildren(scope, teamId, {
            parentId: node.id,
            page: 1,
            pageSize: 100,
          });

          const children = res.data?.list || [];

          updateNodeMap((prev) => {
            const next = new Map(prev);
            const existing = prev.get(node.id);
            next.set(node.id, {
              ...(existing || { expanded: true }),
              loading: false,
              loaded: true,
              children,
            });
            return next;
          });
        } catch {
          updateNodeMap((prev) => {
            const next = new Map(prev);
            const existing = prev.get(node.id);
            next.set(node.id, {
              ...(existing || { expanded: true }),
              loading: false,
              loaded: true,
              children: [],
            });
            return next;
          });
        }
      }
    },
    [scope, teamId, updateNodeMap],
  );

  const expandPath = useCallback(
    async (pathIds: (string | null)[]) => {
      const ids = pathIds.filter((id): id is string => id !== null);
      for (const id of ids) {
        const current = nodeMapRef.current.get(id);
        if (!current?.expanded) {
          await toggleExpand({ id, kind: 'folder' } as MediaNodeDTO);
        }
      }
    },
    [toggleExpand],
  );

  const refreshNode = useCallback(
    async (nodeId: string) => {
      const current = nodeMapRef.current.get(nodeId);
      if (!current?.expanded) return;

      updateNodeMap((prev) => {
        const next = new Map(prev);
        const c = prev.get(nodeId);
        if (c) next.set(nodeId, { ...c, loading: true });
        return next;
      });

      try {
        const res = await listNodeChildren(scope, teamId, {
          parentId: nodeId,
          page: 1,
          pageSize: 100,
        });

        const children = res.data?.list || [];

        updateNodeMap((prev) => {
          const next = new Map(prev);
          const existing = prev.get(nodeId);
          if (existing) {
            next.set(nodeId, { ...existing, loading: false, children, loaded: true });
          }
          return next;
        });
      } catch {
        updateNodeMap((prev) => {
          const next = new Map(prev);
          const existing = prev.get(nodeId);
          if (existing) {
            next.set(nodeId, { ...existing, loading: false });
          }
          return next;
        });
      }
    },
    [scope, teamId, updateNodeMap],
  );

  const refreshRoot = useCallback(async () => {
    try {
      const res = await listNodeChildren(scope, teamId, {
        parentId: null,
        page: 1,
        pageSize: 100,
      });

      const rootChildren = res.data?.list || [];
      updateNodeMap((prev) => {
        const next = new Map(prev);
        next.set('__root__', {
          expanded: true,
          loaded: true,
          loading: false,
          children: rootChildren,
        });
        return next;
      });

      return rootChildren;
    } catch {
      return [];
    }
  }, [scope, teamId, updateNodeMap]);

  const rootChildren = useMemo(() => {
    return nodeMap.get('__root__')?.children || [];
  }, [nodeMap]);

  const selectNode = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  }, []);

  return {
    nodeMap,
    selectedNodeId,
    rootChildren,
    isExpanded,
    isLoading,
    getChildren,
    toggleExpand,
    expandPath,
    refreshNode,
    refreshRoot,
    selectNode,
  };
}

/**
 * 将 MediaNodeDTO 转换为 TDesign Tree 的 data 格式
 */
export function toTreeData(
  nodes: MediaNodeDTO[],
  getChildren: (id: string) => MediaNodeDTO[],
  isExpanded: (id: string) => boolean,
  isLoading: (id: string) => boolean,
): any[] {
  return nodes.map((node) => ({
    label: node.name,
    value: node.id,
    data: node,
    children:
      node.kind === 'folder'
        ? isExpanded(node.id)
          ? toTreeData(getChildren(node.id), getChildren, isExpanded, isLoading)
          : true
        : undefined,
    loading: isLoading(node.id),
    disabled: node.kind === 'file',
    icon: node.kind === 'folder' ? 'folder' : 'file',
  }));
}
