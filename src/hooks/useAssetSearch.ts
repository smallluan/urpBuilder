import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { searchNodes } from '../api/assetNodes';
import type { MediaNodeSearchItem, MediaNodeScope } from '../api/types';

/**
 * 素材节点搜索（debounce）
 * 用于左侧树的搜索功能
 */
export function useAssetSearch(
  scope: MediaNodeScope,
  teamId: string | undefined,
  kind?: 'folder' | 'file',
  pageSize = 20,
) {
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [list, setList] = useState<MediaNodeSearchItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce keyword
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setSearchKeyword = useCallback((value: string) => {
    setKeyword(value);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setDebouncedKeyword(value.trim());
    }, 300);
  }, []);

  const clearSearch = useCallback(() => {
    setKeyword('');
    setDebouncedKeyword('');
    setList([]);
    setTotal(0);
    setPage(1);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  // 执行搜索
  const search = useCallback(async () => {
    if (!debouncedKeyword) {
      setList([]);
      setTotal(0);
      return;
    }

    if (scope === 'team' && !teamId) {
      setList([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await searchNodes(scope, teamId, debouncedKeyword, page, pageSize, kind);

      if (res.code !== 0) {
        setError(res.message || '搜索失败');
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
  }, [scope, teamId, debouncedKeyword, page, pageSize, kind]);

  useEffect(() => {
    search();
  }, [search]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const onPageChange = useCallback((nextPage: number) => {
    setPage(nextPage);
  }, []);

  const hasActiveSearch = useMemo(() => {
    return debouncedKeyword.length > 0;
  }, [debouncedKeyword]);

  return {
    keyword,
    debouncedKeyword,
    list,
    total,
    page,
    pageSize,
    loading,
    error,
    hasActiveSearch,
    setKeyword: setSearchKeyword,
    clearSearch,
    onPageChange,
    refetch: search,
  };
}
