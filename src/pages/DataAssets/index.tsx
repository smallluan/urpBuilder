import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  Empty,
  Input,
  Loading,
  MessagePlugin,
  Pagination,
  Select,
  Space,
  Typography,
  Upload,
} from 'tdesign-react';
import { SearchIcon, UploadIcon } from 'tdesign-icons-react';
import {
  deletePersonalAsset,
  deleteTeamAsset,
  patchPersonalAsset,
  patchTeamAsset,
  uploadPersonalAsset,
  uploadTeamAsset,
} from '../../api/assets';
import type { MediaAssetScope, TeamAssetDTO, TeamAssetKind } from '../../api/types';
import { useAssetsList } from '../../hooks/useAssetsList';
import { useTeam } from '../../team/context';
import TeamAssetGridCard from './TeamAssetGridCard';
import './style.less';

const { Text } = Typography;

function fileFromUploadSelectChange(
  files: Array<File | { raw?: File }> | undefined,
  extra?: { currentSelectedFiles?: Array<{ raw?: File }> },
): File | undefined {
  const first = files?.[0];
  if (first instanceof File) {
    return first;
  }
  const fromItem = (first as { raw?: File } | undefined)?.raw;
  if (fromItem) {
    return fromItem;
  }
  return extra?.currentSelectedFiles?.[0]?.raw;
}

const TYPE_OPTIONS = [
  { label: '全部类型', value: '' },
  { label: '图片', value: 'image' },
  { label: '图标', value: 'icon' },
  { label: '其他', value: 'other' },
];

const DataAssets: React.FC = () => {
  const { workspaceMode, currentTeamId, currentTeam } = useTeam();
  /** 与侧栏空间一致：个人空间只管理个人素材，团队空间只管理当前团队素材，不在此页混切 */
  const assetScope: MediaAssetScope = workspaceMode === 'team' ? 'team' : 'personal';
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<TeamAssetKind | ''>('');
  const [previewAsset, setPreviewAsset] = useState<TeamAssetDTO | null>(null);
  const [renameAsset, setRenameAsset] = useState<TeamAssetDTO | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [deleteAsset, setDeleteAsset] = useState<TeamAssetDTO | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);

  const effectiveTeamId = assetScope === 'team' ? (currentTeamId ?? undefined) : undefined;

  const { list, total, loading, refetch } = useAssetsList(
    assetScope,
    effectiveTeamId,
    page,
    pageSize,
    keyword,
    typeFilter,
  );

  useEffect(() => {
    setPage(1);
  }, [workspaceMode, currentTeamId]);

  const handleSearch = () => {
    setKeyword(keywordInput.trim());
    setPage(1);
  };

  const handleUploadFiles = async (
    files: Array<File | { raw?: File }>,
    extra?: { currentSelectedFiles?: Array<{ raw?: File }> },
  ) => {
    const file = fileFromUploadSelectChange(files, extra);
    if (!file) {
      return;
    }
    if (assetScope === 'team' && !currentTeamId) {
      MessagePlugin.warning('请先选择团队后再上传团队素材');
      return;
    }
    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
      MessagePlugin.warning('单文件大小不能超过 15MB');
      return;
    }
    setUploadBusy(true);
    try {
      if (assetScope === 'personal') {
        await uploadPersonalAsset(file);
      } else {
        await uploadTeamAsset(currentTeamId as string, file);
      }
      MessagePlugin.success('上传成功');
      await refetch();
    } catch {
      //
    } finally {
      setUploadBusy(false);
    }
  };

  const handleConfirmRename = async () => {
    if (!renameAsset) {
      return;
    }
    const name = renameDraft.trim();
    if (!name) {
      MessagePlugin.warning('请输入名称');
      return;
    }
    try {
      if (assetScope === 'personal') {
        await patchPersonalAsset(renameAsset.id, { name });
      } else if (currentTeamId) {
        await patchTeamAsset(currentTeamId, renameAsset.id, { name });
      } else {
        return;
      }
      MessagePlugin.success('已更新');
      setRenameAsset(null);
      await refetch();
    } catch {
      //
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteAsset) {
      return;
    }
    try {
      if (assetScope === 'personal') {
        await deletePersonalAsset(deleteAsset.id);
      } else if (currentTeamId) {
        await deleteTeamAsset(currentTeamId, deleteAsset.id);
      } else {
        return;
      }
      MessagePlugin.success('已删除');
      setDeleteAsset(null);
      await refetch();
    } catch {
      //
    }
  };

  const onPageChange = useCallback((next: number) => {
    setPage(next);
  }, []);

  const headerDesc =
    workspaceMode === 'personal'
      ? '当前为个人空间：此处仅你的个人素材，与团队素材库完全隔离。'
      : currentTeamId
        ? `当前为团队空间：此处仅团队「${currentTeam?.name || currentTeamId}」的共享素材，与个人素材库隔离。`
        : '当前为团队空间：请先在侧栏空间切换器中选择团队，再管理该团队素材。';

  const teamLocked = workspaceMode === 'team' && !currentTeamId;

  return (
    <div className="data-assets-page">
      <div className="data-assets-page__inner">
        <header className="data-assets-page__header">
          <h1 className="data-assets-page__title">素材管理</h1>
          <p className="data-assets-page__desc">{headerDesc}</p>
        </header>

        <div className="data-assets-toolbar">
          <div className="data-assets-toolbar__grow">
            <Space align="center" size={12} breakLine style={{ width: '100%' }}>
              <Input
                clearable
                placeholder="搜索素材名称"
                value={keywordInput}
                onChange={setKeywordInput}
                onEnter={handleSearch}
                suffixIcon={<SearchIcon />}
                style={{ maxWidth: 320 }}
                disabled={teamLocked}
              />
              <Select
                value={typeFilter}
                onChange={(v) => {
                  setTypeFilter((v ?? '') as TeamAssetKind | '');
                  setPage(1);
                }}
                options={TYPE_OPTIONS}
                style={{ width: 140 }}
                placeholder="类型"
                disabled={teamLocked}
              />
              <Button theme="primary" onClick={handleSearch} disabled={teamLocked}>
                搜索
              </Button>
            </Space>
          </div>
          <div className="data-assets-upload">
            <Upload
              theme="custom"
              accept="image/*,.svg,.ico"
              multiple={false}
              autoUpload={false}
              disabled={uploadBusy || teamLocked}
              showUploadProgress={false}
              onSelectChange={handleUploadFiles}
            >
              <Button
                loading={uploadBusy}
                icon={<UploadIcon />}
                theme="primary"
                variant="outline"
                disabled={teamLocked}
              >
                上传素材
              </Button>
            </Upload>
            <Text style={{ display: 'block', marginTop: 8, fontSize: 12, color: 'var(--td-text-color-secondary)' }}>
              支持常见图片与 SVG，单文件建议不超过 15MB
            </Text>
          </div>
        </div>

        {teamLocked ? (
          <Empty description="当前为团队素材视图，请先在侧栏空间切换器中选择团队。" style={{ marginTop: 48 }} />
        ) : (
          <Loading loading={loading} showOverlay style={{ minHeight: 200 }}>
            {list.length === 0 && !loading ? (
              <Empty description="暂无素材，试试上传一张图片" />
            ) : (
              <div className="data-assets-grid">
                {list.map((asset) => (
                  <TeamAssetGridCard
                    key={asset.id}
                    asset={asset}
                    mode="manage"
                    onPreview={setPreviewAsset}
                    onRename={(a) => {
                      setRenameAsset(a);
                      setRenameDraft(a.name);
                    }}
                    onDelete={setDeleteAsset}
                  />
                ))}
              </div>
            )}
          </Loading>
        )}

        {!teamLocked && total > 0 ? (
          <div className="data-assets-pagination">
            <Pagination
              total={total}
              current={page}
              pageSize={pageSize}
              pageSizeOptions={[12, 20, 40]}
              showPageSize
              showJumper
              onCurrentChange={onPageChange}
              onPageSizeChange={(nextSize) => {
                setPage(1);
                setPageSize(nextSize);
              }}
            />
          </div>
        ) : null}
      </div>

      <Dialog
        visible={Boolean(previewAsset)}
        header="预览"
        placement="center"
        width={900}
        className="data-assets-preview-dialog"
        onClose={() => setPreviewAsset(null)}
        footer={false}
        destroyOnClose
      >
        {previewAsset ? (
          <img src={previewAsset.url} alt={previewAsset.name} />
        ) : null}
      </Dialog>

      <Dialog
        visible={Boolean(renameAsset)}
        header="重命名"
        onClose={() => setRenameAsset(null)}
        onConfirm={handleConfirmRename}
      >
        <Input value={renameDraft} onChange={setRenameDraft} placeholder="素材名称" />
      </Dialog>

      <Dialog
        visible={Boolean(deleteAsset)}
        header="删除素材"
        confirmBtn={{ content: '删除', theme: 'danger' }}
        onClose={() => setDeleteAsset(null)}
        onConfirm={handleConfirmDelete}
      >
        <Text>
          删除后，已引用该地址的页面可能无法显示图片。确定删除「{deleteAsset?.name ?? ''}」吗？
        </Text>
      </Dialog>
    </div>
  );
};

export default DataAssets;
