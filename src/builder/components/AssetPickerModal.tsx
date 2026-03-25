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
} from 'tdesign-react';
import { SearchIcon } from 'tdesign-icons-react';
import type { MediaAssetScope, TeamAssetDTO, TeamAssetKind } from '../../api/types';
import { useAssetsList } from '../../hooks/useAssetsList';
import TeamAssetGridCard from '../../pages/DataAssets/TeamAssetGridCard';
import { getMediaAssetUrlFromDrop } from '../../utils/mediaAssetDrag';
import '../../pages/DataAssets/style.less';

const { Text } = Typography;

const TYPE_OPTIONS = [
  { label: '全部', value: '' },
  { label: '图片', value: 'image' },
  { label: '图标', value: 'icon' },
  { label: '其他', value: 'other' },
];

export interface AssetPickerModalProps {
  visible: boolean;
  /** 与侧栏空间一致：个人空间只列个人素材，团队空间只列当前团队素材 */
  workspaceMode: 'personal' | 'team';
  teamId: string | undefined;
  onClose: () => void;
  onConfirm: (url: string) => void;
}

const AssetPickerModal: React.FC<AssetPickerModalProps> = ({
  visible,
  workspaceMode,
  teamId,
  onClose,
  onConfirm,
}) => {
  const listScope: MediaAssetScope = workspaceMode === 'team' ? 'team' : 'personal';
  const effectiveTeamId = listScope === 'team' ? teamId : undefined;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<TeamAssetKind | ''>('');
  const [previewAsset, setPreviewAsset] = useState<TeamAssetDTO | null>(null);
  const [selected, setSelected] = useState<TeamAssetDTO | null>(null);
  const [dropZoneActive, setDropZoneActive] = useState(false);

  const { list, total, loading } = useAssetsList(
    listScope,
    effectiveTeamId,
    page,
    pageSize,
    keyword,
    typeFilter,
  );

  useEffect(() => {
    if (visible) {
      setPage(1);
      setPageSize(12);
      setKeywordInput('');
      setKeyword('');
      setTypeFilter('');
      setSelected(null);
      setPreviewAsset(null);
      setDropZoneActive(false);
    }
  }, [visible, workspaceMode, teamId]);

  const handleSearch = () => {
    setKeyword(keywordInput.trim());
    setPage(1);
  };

  const handleApply = () => {
    if (!selected?.url) {
      return;
    }
    onConfirm(selected.url);
    onClose();
  };

  const handleCardSelect = useCallback((asset: TeamAssetDTO) => {
    setSelected(asset);
  }, []);

  const teamLocked = workspaceMode === 'team' && !teamId;

  return (
    <>
      <Dialog
        visible={visible}
        header="从素材库选择"
        width={960}
        placement="center"
        closeOnOverlayClick={false}
        onClose={onClose}
        onConfirm={handleApply}
        confirmBtn={{
          content: '使用选中素材',
          disabled: !((selected?.url ?? '').trim()),
        }}
        cancelBtn="取消"
      >
        <Text style={{ fontSize: 12, color: 'var(--td-text-color-secondary)', display: 'block', marginBottom: 12 }}>
          {workspaceMode === 'personal'
            ? '当前为个人空间，仅展示你的个人素材。'
            : teamId
              ? '当前为团队空间，仅展示当前团队的共享素材。'
              : '当前为团队空间但未选择团队，无法加载素材。请先在侧栏选择团队。'}
        </Text>

        {!teamLocked ? (
          <>
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Space size={12} breakLine align="center">
                <Input
                  clearable
                  placeholder="搜索名称"
                  value={keywordInput}
                  onChange={setKeywordInput}
                  onEnter={handleSearch}
                  suffixIcon={<SearchIcon />}
                  style={{ width: 260 }}
                />
                <Select
                  value={typeFilter}
                  onChange={(v) => {
                    setTypeFilter((v ?? '') as TeamAssetKind | '');
                    setPage(1);
                  }}
                  options={TYPE_OPTIONS}
                  style={{ width: 120 }}
                />
                <Button theme="primary" size="small" onClick={handleSearch}>
                  搜索
                </Button>
              </Space>
            </Space>

            <Loading loading={loading} style={{ marginTop: 16, minHeight: 200 }}>
              {list.length === 0 && !loading ? (
                <Empty description="暂无素材，请先在「素材管理」中上传" />
              ) : (
                <div className="data-assets-grid" style={{ marginTop: 12 }}>
                  {list.map((asset) => (
                    <TeamAssetGridCard
                      key={asset.id}
                      asset={asset}
                      mode="pick"
                      selected={selected?.id === asset.id}
                      onSelect={handleCardSelect}
                      onPreview={setPreviewAsset}
                      assetDragEnabled
                    />
                  ))}
                </div>
              )}
            </Loading>

            {list.length > 0 ? (
              <div
                className={`asset-picker-drop-zone${dropZoneActive ? ' asset-picker-drop-zone--active' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'copy';
                  setDropZoneActive(true);
                }}
                onDragLeave={(e) => {
                  const next = e.relatedTarget;
                  if (next instanceof Node && e.currentTarget.contains(next)) {
                    return;
                  }
                  setDropZoneActive(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDropZoneActive(false);
                  const url = getMediaAssetUrlFromDrop(e);
                  if (!url) {
                    return;
                  }
                  onConfirm(url);
                  MessagePlugin.success('已应用素材地址');
                }}
              >
                从上方按住卡片拖拽到此处，快速写入当前正在编辑的图片地址（与点选后点「使用选中素材」相同）
              </div>
            ) : null}

            {total > 0 ? (
              <div className="data-assets-pagination">
                <Pagination
                  size="small"
                  total={total}
                  current={page}
                  pageSize={pageSize}
                  pageSizeOptions={[12, 24, 48]}
                  showPageSize
                  showJumper
                  onCurrentChange={setPage}
                  onPageSizeChange={(nextSize) => {
                    setPage(1);
                    setPageSize(nextSize);
                  }}
                />
              </div>
            ) : null}
          </>
        ) : (
          <Empty description="请先在侧栏空间切换器中选择团队。" style={{ marginTop: 24 }} />
        )}
      </Dialog>

      <Dialog
        visible={Boolean(previewAsset)}
        header="预览"
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
    </>
  );
};

export default AssetPickerModal;
