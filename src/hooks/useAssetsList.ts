import { useCallback, useEffect, useState } from 'react';
import { listPersonalAssets, listTeamAssets } from '../api/assets';
import type { MediaAssetScope, TeamAssetDTO, TeamAssetKind } from '../api/types';

/**
 * 个人素材与团队素材分接口拉取，严格区分 scope。
 */
export function useAssetsList(
  scope: MediaAssetScope,
  teamId: string | undefined,
  page: number,
  pageSize: number,
  keyword: string,
  typeFilter: TeamAssetKind | '',
) {
  const [list, setList] = useState<TeamAssetDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (scope === 'team' && !teamId) {
      setList([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    try {
      const res =
        scope === 'personal'
          ? await listPersonalAssets({
              page,
              pageSize,
              keyword: keyword.trim() || undefined,
              type: typeFilter || undefined,
            })
          : await listTeamAssets(teamId as string, {
              page,
              pageSize,
              keyword: keyword.trim() || undefined,
              type: typeFilter || undefined,
            });
      const payload = res.data;
      setList(Array.isArray(payload?.list) ? payload.list : []);
      setTotal(typeof payload?.total === 'number' ? payload.total : 0);
    } catch {
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [scope, teamId, page, pageSize, keyword, typeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return { list, total, loading, refetch: load };
}
