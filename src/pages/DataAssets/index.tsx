import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Breadcrumb,
  Button,
  Dialog,
  Dropdown,
  Empty,
  ImageViewer,
  Input,
  Loading,
  MessagePlugin,
  Pagination,
  Tree,
  Typography,
  Upload,
} from 'tdesign-react';
import { FileIcon, FolderIcon, FolderOpenIcon, ImageIcon, SearchIcon, UploadIcon } from 'tdesign-icons-react';
import { ChevronRight, MoreHorizontal, Plus } from 'lucide-react';
import {
  createFolder,
  deleteNode,
  patchNode,
  uploadNodeFile,
} from '../../api/assetNodes';
import type { MediaAssetScope, MediaNodeDTO, MediaNodeSearchItem } from '../../api/types';
import { useAssetNodeChildren } from '../../hooks/useAssetNodeChildren';
import { useAssetSearch } from '../../hooks/useAssetSearch';
import { useAssetTree } from '../../hooks/useAssetTree';
import { useTeam } from '../../team/context';
import { assetTypeLabel, formatBytes } from './format';
import './style.less';

const { Text } = Typography;

/**
 * 获取节点的面包屑路径（递归构建）
 */
function getBreadcrumbPath(
  nodeId: string | null,
  nodeMap: Map<string, MediaNodeDTO>,
): { id: string | null; name: string }[] {
  const path: { id: string | null; name: string }[] = [{ id: null, name: '根目录' }];

  if (!nodeId) return path;

  const node = nodeMap.get(nodeId);
  if (!node) return path;

  // 递归查找父节点
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
}

const DataAssets: React.FC = () => {
  const { workspaceMode, currentTeamId } = useTeam();
  const assetScope: MediaAssetScope = workspaceMode === 'team' ? 'team' : 'personal';
  const teamId: string | undefined = assetScope === 'team' ? (currentTeamId || undefined) : undefined;

  // 树状态
  const tree = useAssetTree(assetScope, teamId);
  const [nodeMap, setNodeMap] = useState<Map<string, MediaNodeDTO>>(new Map());

  // 右侧当前选中的父节点（null = 根目录）
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);

  // 右侧分页
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 子节点数据
  const { list, total, loading, refetch: refetchChildren } = useAssetNodeChildren(
    assetScope,
    teamId,
    currentParentId,
    page,
    pageSize,
  );

  // 更新节点映射表（用于面包屑）
  useEffect(() => {
    setNodeMap((prev) => {
      const next = new Map(prev);
      list.forEach((item) => next.set(item.id, item));
      return next;
    });
  }, [list]);

  // 搜索
  const search = useAssetSearch(assetScope, teamId ?? undefined);

  // 对话框状态
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadTargetFolderId, setUploadTargetFolderId] = useState<string | null>(null);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadNames, setUploadNames] = useState<Record<string, string>>({});

  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [createFolderParentId, setCreateFolderParentId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  const [renameNode, setRenameNode] = useState<MediaNodeDTO | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  const [deleteNodeState, setDeleteNodeState] = useState<MediaNodeDTO | null>(null);

  const [moveNodeState, setMoveNodeState] = useState<MediaNodeDTO | null>(null);
  // 移动功能占位（未来扩展）
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void moveNodeState;

  const [previewFile, setPreviewFile] = useState<MediaNodeDTO | null>(null);

  // 刷新（回调引用稳定，不依赖 tree 对象）
  const refreshAll = useCallback(() => {
    tree.refreshRoot().then((rootList) => {
      setNodeMap((prev) => {
        const next = new Map(prev);
        rootList.forEach((item) => next.set(item.id, item));
        return next;
      });
    });
    void tree.refreshExpandedNodes();
    refetchChildren();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree.refreshRoot, tree.refreshExpandedNodes, refetchChildren]);

  // 初始化加载根节点（仅当 scope/teamId 变化时触发）
  useEffect(() => {
    if (assetScope === 'team' && !currentTeamId) return;
    tree.refreshRoot().then((rootList) => {
      setNodeMap((prev) => {
        const next = new Map(prev);
        rootList.forEach((item) => next.set(item.id, item));
        return next;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetScope, currentTeamId, tree.refreshRoot]);

  // 面包屑路径
  const breadcrumbPath = useMemo(() => {
    return getBreadcrumbPath(currentParentId, nodeMap);
  }, [currentParentId, nodeMap]);

  // 树数据转换
  const treeData = useMemo(() => {
    const buildTreeData = (nodes: MediaNodeDTO[]): any[] => {
      return nodes.map((node) => ({
        label: (
          <span className="data-assets-tree-label">
            <span className={`data-assets-tree-label__icon ${node.kind === 'folder' ? 'is-folder' : 'is-file'}`}>
              {node.kind === 'folder' ? <FolderIcon size="14px" /> : <ImageIcon size="14px" />}
            </span>
            <span className="data-assets-tree-label__text">{node.name}</span>
          </span>
        ),
        value: node.id,
        data: node,
        children: node.kind === 'folder'
          ? (tree.isExpanded(node.id) ? buildTreeData(tree.getChildren(node.id)) : true)
          : undefined,
        loading: tree.isLoading(node.id),
        disabled: node.kind === 'file',
      }));
    };
    return buildTreeData(tree.rootChildren);
  }, [tree.rootChildren, tree.nodeMap, tree.getChildren, tree.isExpanded, tree.isLoading]);

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
  const handleBreadcrumbClick = useCallback(
    (id: string | null) => {
      setCurrentParentId(id);
      setPage(1);
      tree.selectNode(id);
    },
    [tree.selectNode],
  );

  // 创建文件夹
  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) {
      MessagePlugin.warning('请输入文件夹名称');
      return;
    }

    setCreatingFolder(true);
    try {
      await createFolder(assetScope, teamId ?? undefined, { parentId: createFolderParentId, name });
      MessagePlugin.success('文件夹创建成功');
      setCreateFolderOpen(false);
      setNewFolderName('');
      refreshAll();
    } catch (e: any) {
      MessagePlugin.error(e?.message || '创建失败');
    } finally {
      setCreatingFolder(false);
    }
  };

  // 重命名
  const handleRename = async () => {
    if (!renameNode) return;
    const name = renameDraft.trim();
    if (!name) {
      MessagePlugin.warning('请输入名称');
      return;
    }

    try {
      await patchNode(assetScope, teamId ?? undefined, renameNode.id, { name });
      MessagePlugin.success('重命名成功');
      setRenameNode(null);
      refreshAll();
    } catch (e: any) {
      MessagePlugin.error(e?.message || '重命名失败');
    }
  };

  // 删除
  const handleDelete = async () => {
    if (!deleteNodeState) return;

    try {
      await deleteNode(assetScope, teamId || undefined, deleteNodeState.id);
      MessagePlugin.success('删除成功');
      setDeleteNodeState(null);

      // 如果删除的是当前目录，回到父目录
      if (deleteNodeState.id === currentParentId) {
        const parent = nodeMap.get(deleteNodeState.id)?.parentId ?? null;
        setCurrentParentId(parent);
      }

      refreshAll();
    } catch (e: any) {
      // 409 表示文件夹非空
      if (e?.response?.status === 409) {
        MessagePlugin.error('文件夹非空，请先删除内部文件');
      } else {
        MessagePlugin.error(e?.message || '删除失败');
      }
    }
  };

  // 上传文件
  const handleUpload = async () => {
    if (uploadFiles.length === 0) return;

    if (assetScope === 'team' && !currentTeamId) {
      MessagePlugin.warning('请先选择团队');
      return;
    }

    setUploading(true);
    try {
      for (const file of uploadFiles) {
        const maxSize = 15 * 1024 * 1024;
        if (file.size > maxSize) {
          MessagePlugin.warning(`「${file.name}」超过 15MB，跳过`);
          continue;
        }

        const customName = uploadNames[file.name]?.trim();
        await uploadNodeFile(assetScope, teamId || undefined, file, {
          name: customName,
          parentId: uploadTargetFolderId,
        });
      }

      MessagePlugin.success('上传成功');
      setUploadDialogOpen(false);
      setUploadFiles([]);
      setUploadNames({});
      refreshAll();
    } catch (e: any) {
      MessagePlugin.error(e?.message || '上传失败');
    } finally {
      setUploading(false);
    }
  };

  // 搜索定位
  const handleSearchSelect = async (item: MediaNodeSearchItem) => {
    // 展开路径
    if (item.pathIds && item.pathIds.length > 0) {
      await tree.expandPath(item.pathIds);
    }

    // 选中并跳转
    if (item.kind === 'folder') {
      setCurrentParentId(item.id);
      tree.selectNode(item.id);
    } else {
      // 文件：跳转到父目录并预览
      const parent = item.parentId;
      setCurrentParentId(parent);
      tree.selectNode(parent);
      setPreviewFile(item as MediaNodeDTO);
    }

    search.clearSearch();
  };

  const teamLocked = assetScope === 'team' && !currentTeamId;

  if (teamLocked) {
    return (
      <div className="data-assets-page data-assets-page--gate">
        <div className="data-assets-page__inner">
          <Empty
            title="请先选择团队"
            description="当前为团队素材视图，请在侧栏空间切换器中切换到团队后再管理素材。"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="data-assets-page data-assets-page--with-tree">
      {/* 左侧树 */}
      <aside className="data-assets-sidebar">
        <div className="data-assets-sidebar__header">
          <Input
            placeholder="搜索素材..."
            value={search.keyword}
            onChange={search.setKeyword}
            prefixIcon={<SearchIcon />}
            clearable
            onClear={search.clearSearch}
          />
        </div>

        {/* 搜索结果 */}
        {search.hasActiveSearch && (
          <div className="data-assets-search-results">
            <Loading loading={search.loading} size="small">
              {search.list.length === 0 ? (
                <Empty description="未找到结果" size="small" />
              ) : (
                <div className="data-assets-search-list">
                  {search.list.map((item) => (
                    <div
                      key={item.id}
                      className="data-assets-search-item"
                      onClick={() => handleSearchSelect(item)}
                    >
                      <div className="data-assets-search-item__icon">
                        {item.kind === 'folder' ? <FolderIcon size="16px" /> : <ImageIcon size="16px" />}
                      </div>
                      <div className="data-assets-search-item__info">
                        <div className="data-assets-search-item__name">{item.name}</div>
                        <div className="data-assets-search-item__path">
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
        <div className="data-assets-tree-wrap">
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
      <main className="data-assets-main">
        {/* 面包屑 + 工具栏 */}
        <div className="data-assets-main__header">
          <Breadcrumb separator={<ChevronRight size={14} />}>
            {breadcrumbPath.map((item, index) => (
              <Breadcrumb.BreadcrumbItem
                key={item.id ?? 'root'}
                onClick={() => index < breadcrumbPath.length - 1 && handleBreadcrumbClick(item.id)}
                style={{ cursor: index < breadcrumbPath.length - 1 ? 'pointer' : 'default' }}
              >
                {index === 0 ? <FolderOpenIcon /> : item.name}
              </Breadcrumb.BreadcrumbItem>
            ))}
          </Breadcrumb>

          <div className="data-assets-main__toolbar">
            <Button
              variant="outline"
              size="small"
              onClick={() => {
                setCreateFolderParentId(currentParentId);
                setCreateFolderOpen(true);
              }}
            >
              <Plus size={16} style={{ marginRight: 4 }} />
              新建文件夹
            </Button>

            <Button
              theme="primary"
              size="small"
              onClick={() => {
                setUploadTargetFolderId(currentParentId);
                setUploadDialogOpen(true);
              }}
            >
              <UploadIcon style={{ marginRight: 4 }} />
              上传素材
            </Button>
          </div>
        </div>

        {/* 内容网格 */}
        <div className="data-assets-main__body">
          <Loading
            loading={loading}
            showOverlay
            style={{ flex: 1, minHeight: 0, width: '100%', display: 'flex', flexDirection: 'column' }}
          >
            {list.length === 0 && !loading ? (
              <div className="data-assets-main__empty">
                <Empty
                  title="当前文件夹为空"
                  description="使用上方「新建文件夹」整理目录，或「上传素材」添加图片与文件。"
                />
              </div>
            ) : (
              <div className="data-assets-grid data-assets-grid--mixed">
                {list.map((node) => (
                  <NodeCard
                    key={node.id}
                    node={node}
                    onOpenFolder={(id) => {
                      setCurrentParentId(id);
                      setPage(1);
                      tree.selectNode(id);
                    }}
                    onPreview={setPreviewFile}
                    onRename={(n) => {
                      setRenameNode(n);
                      setRenameDraft(n.name);
                    }}
                    onDelete={setDeleteNodeState}
                    onMove={setMoveNodeState}
                  />
                ))}
              </div>
            )}
          </Loading>
        </div>

        {/* 分页 */}
        {total > 0 && (
          <div className="data-assets-pagination">
            <Pagination
              total={total}
              current={page}
              pageSize={pageSize}
              pageSizeOptions={[12, 20, 40]}
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

      {/* 上传对话框 */}
      <Dialog
        header="上传素材"
        visible={uploadDialogOpen}
        onClose={() => {
          setUploadDialogOpen(false);
          setUploadFiles([]);
          setUploadNames({});
        }}
        confirmBtn={{
          content: '开始上传',
          theme: 'primary',
          loading: uploading,
          disabled: uploadFiles.length === 0 || uploading,
        }}
        cancelBtn="取消"
        onConfirm={handleUpload}
        width={560}
      >
        <div className="data-assets-upload-dialog">
          <div className="data-assets-upload-dialog__target">
            <Text>目标位置：</Text>
            <Text strong>
              {uploadTargetFolderId === null ? '根目录' : nodeMap.get(uploadTargetFolderId)?.name || '未知文件夹'}
            </Text>
          </div>

          <Upload
            theme="file"
            multiple
            autoUpload={false}
            accept="image/*,.svg,.ico"
            onSelectChange={(files) => {
              const realFiles: File[] = [];
              files?.forEach((f: any) => {
                if (f instanceof File) {
                  realFiles.push(f);
                } else if (f?.raw instanceof File) {
                  realFiles.push(f.raw);
                }
              });
              setUploadFiles(realFiles);
            }}
          />

          {uploadFiles.length > 0 && (
            <div className="data-assets-upload-dialog__files">
              <Text style={{ marginBottom: 8, display: 'block' }}>自定义文件名（可选）：</Text>
              {uploadFiles.map((file) => (
                <div key={file.name} className="data-assets-upload-file-item">
                  <Text className="data-assets-upload-file-item__name">{file.name}</Text>
                  <Input
                    size="small"
                    placeholder={`使用原名: ${file.name}`}
                    value={uploadNames[file.name] || ''}
                    onChange={(v) => setUploadNames((prev) => ({ ...prev, [file.name]: String(v ?? '') }))}
                    style={{ flex: 1, maxWidth: 240 }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </Dialog>

      {/* 创建文件夹对话框 */}
      <Dialog
        header="新建文件夹"
        visible={createFolderOpen}
        onClose={() => setCreateFolderOpen(false)}
        onConfirm={handleCreateFolder}
        confirmBtn={{ loading: creatingFolder }}
      >
        <div style={{ padding: '8px 0' }}>
          <Text style={{ marginBottom: 12, display: 'block', color: 'var(--td-text-color-secondary)' }}>
            在「{createFolderParentId === null ? '根目录' : nodeMap.get(createFolderParentId)?.name || '当前位置'}」下创建
          </Text>
          <Input
            placeholder="文件夹名称"
            value={newFolderName}
            onChange={setNewFolderName}
            onEnter={handleCreateFolder}
          />
        </div>
      </Dialog>

      {/* 重命名对话框 */}
      <Dialog
        header="重命名"
        visible={Boolean(renameNode)}
        onClose={() => setRenameNode(null)}
        onConfirm={handleRename}
      >
        <Input
          placeholder="新名称"
          value={renameDraft}
          onChange={setRenameDraft}
          onEnter={handleRename}
        />
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog
        header={`删除${deleteNodeState?.kind === 'folder' ? '文件夹' : '文件'}`}
        visible={Boolean(deleteNodeState)}
        onClose={() => setDeleteNodeState(null)}
        onConfirm={handleDelete}
        confirmBtn={{ content: '删除', theme: 'danger' }}
      >
        <Text>
          确定删除「{deleteNodeState?.name}」吗？
          {deleteNodeState?.kind === 'folder' && '文件夹必须为空才能删除。'}
        </Text>
      </Dialog>

      {previewFile?.url && (
        <ImageViewer
          visible
          images={[previewFile.url]}
          onClose={() => setPreviewFile(null)}
          trigger={() => null}
        />
      )}
    </div>
  );
};

/**
 * 节点卡片组件（文件夹或文件）
 */
interface NodeCardProps {
  node: MediaNodeDTO;
  onOpenFolder: (id: string) => void;
  onPreview: (node: MediaNodeDTO) => void;
  onRename: (node: MediaNodeDTO) => void;
  onDelete: (node: MediaNodeDTO) => void;
  onMove: (node: MediaNodeDTO) => void;
}

const NodeCard: React.FC<NodeCardProps> = ({ node, onOpenFolder, onPreview, onRename, onDelete, onMove }) => {
  const isFolder = node.kind === 'folder';

  const options = [
    { content: '重命名', value: 'rename' },
    { content: '移动到...', value: 'move' },
    { content: '删除', value: 'delete', theme: 'error' as const },
  ];

  const handleClick = () => {
    if (isFolder) {
      onOpenFolder(node.id);
    } else {
      onPreview(node);
    }
  };

  const handleOptionClick = (dropdownItem: { value?: string | number | Record<string, any> }) => {
    const value = dropdownItem.value;
    if (value === 'rename') onRename(node);
    if (value === 'delete') onDelete(node);
    if (value === 'move') onMove(node);
  };

  return (
    <div className="data-assets-node-card" onClick={handleClick}>
      <div className={`data-assets-node-card__thumb ${isFolder ? 'is-folder' : ''}`}>
        {isFolder ? (
          <FolderIcon size="40px" className="data-assets-node-card__folder-icon" />
        ) : node.thumbnailUrl || node.url ? (
          <img src={node.thumbnailUrl || node.url} alt={node.name} loading="lazy" />
        ) : (
          <FileIcon size="36px" className="data-assets-node-card__file-icon" />
        )}

        {/* 操作按钮 */}
        <div className="data-assets-node-card__actions" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
          <Dropdown
            trigger="click"
            options={options}
            onClick={handleOptionClick}
            popupProps={{ zIndex: 5000 }}
          >
            <Button
              size="small"
              variant="text"
              theme="default"
              className="data-assets-node-card__menu-btn"
            >
              <MoreHorizontal size={16} />
            </Button>
          </Dropdown>
        </div>
      </div>

      <div className="data-assets-node-card__meta">
        <Text className="data-assets-node-card__name" ellipsis>
          {node.name}
        </Text>
        <div className="data-assets-node-card__info">
          {isFolder ? (
            <span className="data-assets-node-card__badge">文件夹</span>
          ) : (
            <>
              <span className="data-assets-node-card__type">{assetTypeLabel(node.type || 'other')}</span>
              <span className="data-assets-node-card__size">{formatBytes(node.sizeBytes || 0)}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataAssets;
