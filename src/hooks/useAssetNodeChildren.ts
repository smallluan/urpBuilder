import { useCallback, useEffect, useState } from 'react';
import { listNodeChildren } from '../api/assetNodes';
import type { MediaNodeDTO, MediaNodeScope } from '../api/types';

/**
 * 获取素材节点子节点（懒加载）
 * 用于右侧内容区展示当前文件夹下的子节点（文件夹 + 文件）
 */
export function useAssetNodeChildren(
  scope: MediaNodeScope,
  teamId: string | undefined,
  parentId: string | null,
  page = 1,
  pageSize = 20,
  keyword = '',
) {
  const [list, setList] = useState<MediaNodeDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (scope === 'team' && !teamId) {
      setList([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await listNodeChildren(scope, teamId, {
        parentId,
        page,
        pageSize,
        keyword: keyword.trim() || undefined,
      });

      if (res.code !== 0) {
        setError(res.message || '加载失败');
        setList([]);
        setTotal(0);
        return;
      }

      setList(res.data?.list || []);
      setTotal(res.data?.total || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络错误');
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [scope, teamId, parentId, page, pageSize, keyword]);

  useEffect(() => {
    load();
  }, [load]);

  const refetch = useCallback(() => {
    load();
  }, [load]);

  return {
    list,
    total,
    loading,
    error,
    refetch,
  };
}
