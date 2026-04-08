import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Breadcrumb,
  Button,
  Dialog,
  Empty,
  Input,
  Loading,
  Pagination,
  Space,
  Tree,
  Typography,
} from 'tdesign-react';
import { SearchIcon } from 'tdesign-icons-react';
import { ChevronRight, FileImage, Folder, FolderOpen } from 'lucide-react';
import { getMediaAssetUrlFromDrop } from '../../utils/mediaAssetDrag';
import type { MediaAssetScope, MediaNodeDTO, MediaNodeSearchItem } from '../../api/types';
import { useAssetNodeChildren } from '../../hooks/useAssetNodeChildren';
import { useAssetSearch } from '../../hooks/useAssetSearch';
import { useAssetTree, toTreeData } from '../../hooks/useAssetTree';
import TeamAssetGridCard from '../../pages/DataAssets/TeamAssetGridCard';
import { MessagePlugin } from 'tdesign-react';
import '../../pages/DataAssets/style.less';
import './AssetPickerModal.less';

const { Text } = Typography;

export interface AssetPickerModalProps {
  visible: boolean;
  /** 与侧栏空间一致：个人空间只列个人素材，团队空间只列当前团队素材 */
  workspaceMode: 'personal' | 'team';
  teamId: string | undefined;
  onClose: () => void;
  onConfirm: (url: string) => void;
}

/**
 * 将 MediaNodeDTO（文件）转换为 TeamAssetDTO 兼容格式用于卡片展示
 */
function nodeToAsset(node: MediaNodeDTO): any {
  return {
    id: node.id,
    name: node.name,
    type: node.type || 'other',
    mimeType: node.mimeType || 'image/png',
    sizeBytes: node.sizeBytes || 0,
    url: node.url || '',
    thumbnailUrl: node.thumbnailUrl || node.url || '',
    width: node.width,
    height: node.height,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    teamId: node.teamId,
  };
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

  // 树状态
  const tree = useAssetTree(listScope, effectiveTeamId);
  const [nodeMap, setNodeMap] = useState<Map<string, MediaNodeDTO>>(new Map());

  // 当前选中的文件夹（null = 根目录）
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);

  // 右侧分页（仅文件）
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // 获取当前文件夹的子节点
  const { list, total, loading } = useAssetNodeChildren(
    listScope,
    effectiveTeamId,
    currentParentId,
    page,
    pageSize,
  );

  // 更新节点映射
  useEffect(() => {
    setNodeMap((prev) => {
      const next = new Map(prev);
      list.forEach((item) => next.set(item.id, item));
      return next;
    });
  }, [list]);

  // 搜索
  const search = useAssetSearch(listScope, effectiveTeamId, 'file'); // 只搜索文件

  // 选中的文件
  const [selectedFile, setSelectedFile] = useState<MediaNodeDTO | null>(null);
  const [previewFile, setPreviewFile] = useState<MediaNodeDTO | null>(null);
  const [dropZoneActive, setDropZoneActive] = useState(false);

  // 初始化
  useEffect(() => {
    if (visible) {
      setPage(1);
      setPageSize(12);
      setCurrentParentId(null);
      setSelectedFile(null);
      setPreviewFile(null);
      search.clearSearch();
      // 加载根节点
      tree.refreshRoot().then((rootList) => {
        setNodeMap((prev) => {
          const next = new Map(prev);
          rootList.forEach((item) => next.set(item.id, item));
          return next;
        });
      });
    }
  }, [visible, workspaceMode, teamId]);

  // 面包屑路径
  const breadcrumbPath = useMemo(() => {
    const path: { id: string | null; name: string }[] = [{ id: null, name: '根目录' }];

    if (!currentParentId) return path;

    const node = nodeMap.get(currentParentId);
    if (!node) return path;

    // 递归构建路径
    const buildPath = (current: MediaNodeDTO | undefined): { id: string | null; name: string }[] => {
      if (!current) return [];
      if (current.parentId === null) {
        return [{ id: current.id, name: current.name }];
      }
      const parent = nodeMap.get(current.parentId);
      return [...buildPath(parent), { id: current.id, name: current.name }];
    };

    const parentPath = buildPath(node);
    return [path[0], ...parentPath];
  }, [currentParentId, nodeMap]);

  // 树数据
  const treeData = useMemo(() => {
    return toTreeData(tree.rootChildren, tree.getChildren, tree.isExpanded, tree.isLoading);
  }, [tree.rootChildren, tree.getChildren, tree.isExpanded, tree.isLoading]);

  // 树节点展开
  const handleTreeExpand = useCallback(
    (_expandedKeys: any, context: any) => {
      const data = context?.node?.data?.data as MediaNodeDTO | undefined;
      if (data && data.kind === 'folder') {
        tree.toggleExpand(data);
      }
    },
    [tree.toggleExpand],
  );

  // 树节点点击（选中文件夹）
  const handleTreeClick = useCallback(
    (context: any) => {
      const data = context?.node?.data?.data as MediaNodeDTO | undefined;
      if (!data) return;

      tree.selectNode(data.id);

      if (data.kind === 'folder') {
        setCurrentParentId(data.id);
        setPage(1);
        if (!tree.isExpanded(data.id)) {
          tree.toggleExpand(data);
        }
      }
    },
    [tree.selectNode, tree.isExpanded, tree.toggleExpand],
  );

  // 面包屑跳转
  const handleBreadcrumbClick = useCallback((id: string | null) => {
    setCurrentParentId(id);
    setPage(1);
    tree.selectNode(id);
  }, [tree.selectNode]);

  // 确认选择
  const handleApply = () => {
    if (!selectedFile?.url) {
      return;
    }
    onConfirm(selectedFile.url);
    onClose();
  };

  // 拖拽投放
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDropZoneActive(false);
    const url = getMediaAssetUrlFromDrop(e);
    if (!url) return;
    onConfirm(url);
    MessagePlugin.success('已应用素材地址');
  };

  // 搜索选择
  const handleSearchSelect = async (item: MediaNodeSearchItem) => {
    // 展开路径
    if (item.pathIds && item.pathIds.length > 0) {
      await tree.expandPath(item.pathIds);
    }

    // 跳转到父目录并选中文件
    const parent = item.parentId;
    setCurrentParentId(parent);
    setPage(1);
    tree.selectNode(parent);

    // 选中该文件（如果是文件）
    if (item.kind === 'file') {
      const fileNode: MediaNodeDTO = {
        id: item.id,
        kind: 'file',
        parentId: item.parentId,
        name: item.name,
        type: item.type,
        mimeType: item.mimeType,
        sizeBytes: item.sizeBytes,
        url: item.url,
        thumbnailUrl: item.thumbnailUrl,
        width: item.width,
        height: item.height,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        teamId: item.teamId,
      };
      setSelectedFile(fileNode);
    }

    search.clearSearch();
  };

  const teamLocked = workspaceMode === 'team' && !teamId;

  // 文件列表（过滤出 file 类型）
  const fileList = useMemo(() => {
    return list.filter((item) => item.kind === 'file');
  }, [list]);

  // 文件夹列表（用于快速导航按钮）
  const folderList = useMemo(() => {
    return list.filter((item) => item.kind === 'folder');
  }, [list]);

  return (
    <>
      <Dialog
        visible={visible}
        header="从素材库选择"
        width={1100}
        placement="center"
        closeOnOverlayClick={false}
        onClose={onClose}
        onConfirm={handleApply}
        confirmBtn={{
          content: '使用选中素材',
          disabled: !((selectedFile?.url ?? '').trim()),
        }}
        cancelBtn="取消"
        className="asset-picker-dialog"
      >
        <Text className="asset-picker-hint">
          {workspaceMode === 'personal'
            ? '当前为个人空间，仅展示你的个人素材。'
            : teamId
              ? '当前为团队空间，仅展示当前团队的共享素材。'
              : '当前为团队空间但未选择团队，无法加载素材。请先在侧栏选择团队。'}
        </Text>

        {!teamLocked ? (
          <div className="asset-picker-layout">
            {/* 左侧树 */}
            <aside className="asset-picker-sidebar">
              <div className="asset-picker-sidebar__header">
                <Input
                  placeholder="搜索文件..."
                  value={search.keyword}
                  onChange={search.setKeyword}
                  prefixIcon={<SearchIcon />}
                  clearable
                  onClear={search.clearSearch}
                  size="small"
                />
              </div>

              {/* 搜索结果 */}
              {search.hasActiveSearch && (
                <div className="asset-picker-search-results">
                  <Loading loading={search.loading} size="small">
                    {search.list.length === 0 ? (
                      <Empty description="未找到结果" size="small" />
                    ) : (
                      <div className="asset-picker-search-list">
                        {search.list.map((item) => (
                          <div
                            key={item.id}
                            className="asset-picker-search-item"
                            onClick={() => handleSearchSelect(item)}
                          >
                            <FileImage size={16} className="asset-picker-search-item__icon" />
                            <div className="asset-picker-search-item__info">
                              <div className="asset-picker-search-item__name">{item.name}</div>
                              <div className="asset-picker-search-item__path">
                                {item.pathNames?.join(' / ') || '根目录'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Loading>
                </div>
              )}

              {/* 树 */}
              <div className="asset-picker-tree-wrap">
                <Tree
                  data={treeData}
                  activable
                  hover
                  expandOnClickNode={false}
                  line
                  icon
                  onExpand={handleTreeExpand}
                  onClick={handleTreeClick}
                  actived={tree.selectedNodeId ? [tree.selectedNodeId] : []}
                  empty="暂无文件夹"
                />
              </div>
            </aside>

            {/* 右侧内容区 */}
            <main className="asset-picker-main">
              {/* 面包屑 + 工具栏 */}
              <div className="asset-picker-main__header">
                <Breadcrumb separator={<ChevronRight size={14} />}>
                  {breadcrumbPath.map((item, index) => (
                    <Breadcrumb.BreadcrumbItem
                      key={item.id ?? 'root'}
                      onClick={() => index < breadcrumbPath.length - 1 && handleBreadcrumbClick(item.id)}
                      style={{ cursor: index < breadcrumbPath.length - 1 ? 'pointer' : 'default' }}
                    >
                      {index === 0 ? <FolderOpen size={14} /> : item.name}
                    </Breadcrumb.BreadcrumbItem>
                  ))}
                </Breadcrumb>

                {/* 快速进入子文件夹 */}
                {folderList.length > 0 && (
                  <Space size={8} className="asset-picker-quick-folders">
                    <Text theme="secondary" style={{ fontSize: 12 }}>子文件夹:</Text>
                    {folderList.slice(0, 5).map((folder) => (
                      <Button
                        key={folder.id}
                        size="small"
                        variant="text"
                        onClick={() => {
                          setCurrentParentId(folder.id);
                          setPage(1);
                          tree.selectNode(folder.id);
                        }}
                      >
                        <Folder size={12} style={{ marginRight: 4 }} />
                        {folder.name}
                      </Button>
                    ))}
                  </Space>
                )}
              </div>

              {/* 文件网格 */}
              <Loading loading={loading} style={{ minHeight: 200, flex: 1 }}>
                {fileList.length === 0 && !loading ? (
                  <Empty description="当前文件夹暂无文件，请在「素材管理」中上传" />
                ) : (
                  <div className="data-assets-grid asset-picker-grid">
                    {fileList.map((node) => (
                      <TeamAssetGridCard
                        key={node.id}
                        asset={nodeToAsset(node)}
                        mode="pick"
                        selected={selectedFile?.id === node.id}
                        onSelect={(asset) => {
                          // 回找到原始 node
                          const originalNode = list.find((n) => n.id === asset.id);
                          if (originalNode && originalNode.kind === 'file') {
                            setSelectedFile(originalNode);
                          }
                        }}
                        onPreview={(asset) => {
                          const originalNode = list.find((n) => n.id === asset.id);
                          if (originalNode) setPreviewFile(originalNode);
                        }}
                        assetDragEnabled
                      />
                    ))}
                  </div>
                )}
              </Loading>

              {/* 投放区 */}
              {fileList.length > 0 && (
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
                  onDrop={handleDrop}
                >
                  从上方按住卡片拖拽到此处，快速写入当前正在编辑的图片地址
                </div>
              )}

              {/* 分页 */}
              {total > 0 && (
                <div className="data-assets-pagination asset-picker-pagination">
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
              )}
            </main>
          </div>
        ) : (
          <Empty description="请先在侧栏空间切换器中选择团队。" style={{ marginTop: 24 }} />
        )}
      </Dialog>

      <Dialog
        visible={Boolean(previewFile)}
        header={previewFile?.name || '预览'}
        width={900}
        className="data-assets-preview-dialog"
        onClose={() => setPreviewFile(null)}
        footer={false}
        destroyOnClose
      >
        {previewFile?.url && <img src={previewFile.url} alt={previewFile.name} />}
      </Dialog>
    </>
  );
};

export default AssetPickerModal;
