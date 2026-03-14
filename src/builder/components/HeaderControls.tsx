import React, { useMemo, useState } from 'react';
import { Radio, Button, Space, Drawer, Timeline, Tag, Dialog, Input } from 'tdesign-react';
import { UploadIcon, ViewImageIcon, ArrowLeftIcon, ArrowRightIcon, HistoryIcon } from 'tdesign-icons-react';
import { useBuilderContext } from '../context/BuilderContext';
import type { UiHistoryAction } from '../store/types';
import { serializePreviewSnapshot } from '../../pages/PreviewEngine/utils/snapshot';
import { savePageDraft, updatePageDraft } from '../../api/pageTemplate';
import { emitApiAlert } from '../../api/alertBus';

type Props = {
  mode: 'component' | 'flow';
  onChange: (v: 'component' | 'flow') => void;
  designLabel?: string;
  saveEntityLabel?: string;
};

const toReadableValue = (value: unknown) => {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (value === null || value === undefined) {
    return '-';
  }

  return JSON.stringify(value);
};

const toActionDescription = (action: UiHistoryAction) => {
  if (action.type === 'add') {
    return {
      title: `新增组件：${action.nodeLabel}`,
      subtitle: `${action.nodeType || '未知类型'} · ${action.nodeKey}`,
      theme: 'success' as const,
      kind: '新增',
      lines: [`父节点：${action.parentKey}`, `插入位置：${action.index}`],
    };
  }

  if (action.type === 'remove') {
    return {
      title: `删除组件：${action.nodeLabel}`,
      subtitle: `${action.nodeType || '未知类型'} · ${action.nodeKey}`,
      theme: 'danger' as const,
      kind: '删除',
      lines: [`原父节点：${action.parentKey}`, `原位置：${action.index}`],
    };
  }

  if (action.type === 'update-label') {
    return {
      title: `修改组件名称：${action.nextLabel}`,
      subtitle: `${action.nodeType || '未知类型'} · ${action.nodeKey}`,
      theme: 'primary' as const,
      kind: '改名',
      lines: [`旧名称：${action.prevLabel}`, `新名称：${action.nextLabel}`],
    };
  }

  if (action.type === 'update-prop') {
    return {
      title: `修改属性：${action.propKey}`,
      subtitle: `${action.nodeLabel}（${action.nodeType || '未知类型'}） · ${action.nodeKey}`,
      theme: 'warning' as const,
      kind: '改属性',
      lines: [`旧值：${toReadableValue(action.prevValue)}`, `新值：${toReadableValue(action.nextValue)}`],
    };
  }

  if (action.type === 'replace-layout') {
    return {
      title: `应用布局：${action.nextLayoutTemplateId}`,
      subtitle: '页面结构',
      theme: 'primary' as const,
      kind: '布局',
      lines: [
        `旧布局：${action.prevLayoutTemplateId ?? '无'}`,
        `新布局：${action.nextLayoutTemplateId}`,
      ],
    };
  }

  return {
    title: `流程操作：${action.actionLabel}`,
    subtitle: '流程画布',
    theme: 'primary' as const,
    kind: '流程',
    lines: [
      `节点：+${action.nodePatch.added.length} -${action.nodePatch.removed.length} ~${action.nodePatch.updated.length}`,
      `连线：+${action.edgePatch.added.length} -${action.edgePatch.removed.length} ~${action.edgePatch.updated.length}`,
    ],
  };
};

const HeaderControls: React.FC<Props> = ({
  mode,
  onChange,
  designLabel = '组件',
  saveEntityLabel = '组件',
}) => {
  const { useStore } = useBuilderContext();
  const history = useStore((state) => state.history);
  const uiTreeData = useStore((state) => state.uiPageData);
  const flowNodes = useStore((state) => state.flowNodes);
  const flowEdges = useStore((state) => state.flowEdges);
  const screenSize = useStore((state) => state.screenSize);
  const autoWidth = useStore((state) => state.autoWidth);
  const currentPageId = useStore((state) => state.currentPageId);
  const currentPageName = useStore((state) => state.currentPageName);
  const setCurrentPageMeta = useStore((state) => state.setCurrentPageMeta);
  const selectedLayoutTemplateId = useStore((state) => state.selectedLayoutTemplateId);
  const undo = useStore((state) => state.undo);
  const redo = useStore((state) => state.redo);
  const jumpToHistory = useStore((state) => state.jumpToHistory);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [saveDialogVisible, setSaveDialogVisible] = useState(false);
  const [componentName, setComponentName] = useState('');
  const [componentId, setComponentId] = useState('');
  const [saving, setSaving] = useState(false);

  const canUndo = history.pointer >= 0;
  const canRedo = history.pointer < history.actions.length - 1;
  const isEditMode = Boolean(currentPageId);

  const displayTimelineItems = useMemo(
    () =>
      history.actions
        .map((action, index) => ({
          index,
          time: new Date(action.timestamp).toLocaleTimeString('zh-CN', { hour12: false }),
          detail: toActionDescription(action),
        }))
        .reverse(),
    [history.actions],
  );

  const handleChange = (value: any) => {
    onChange(String(value) === '1' ? 'component' : 'flow');
  };

  const handlePreview = () => {
    const snapshot = serializePreviewSnapshot({
      uiTreeData,
      flowNodes,
      flowEdges,
    });

    const snapshotKey = `preview-snapshot-${Date.now()}-${Math.round(Math.random() * 10000)}`;
    window.localStorage.setItem(snapshotKey, snapshot);

    const previewUrl = new URL('/preview-engine', window.location.origin);
    previewUrl.searchParams.set('snapshotKey', snapshotKey);

    window.open(previewUrl.toString(), '_blank', 'noopener,noreferrer');
  };

  const handleOpenSaveDialog = () => {
    setComponentName(currentPageName || '');
    setComponentId(currentPageId || '');
    setSaveDialogVisible(true);
  };

  const handleCloseSaveDialog = () => {
    if (saving) {
      return;
    }

    setSaveDialogVisible(false);
  };

  const handleSave = async () => {
    const pageName = componentName.trim();
    const pageId = componentId.trim();

    if (!pageName) {
      emitApiAlert('保存失败', `请输入${saveEntityLabel}名称`);
      return;
    }

    if (!pageId) {
      emitApiAlert('保存失败', `请输入${saveEntityLabel} ID`);
      return;
    }

    if (!/^[A-Za-z0-9_-]+$/.test(pageId)) {
      emitApiAlert('保存失败', `${saveEntityLabel} ID 仅支持字母、数字、下划线和中划线`);
      return;
    }

    setSaving(true);

    try {
      const payload = {
        base: {
          pageId,
          pageName,
          screenSize,
          autoWidth,
        },
        template: {
          uiTree: uiTreeData as unknown as Record<string, unknown>,
          flowNodes: flowNodes as unknown as Array<Record<string, unknown>>,
          flowEdges: flowEdges as unknown as Array<Record<string, unknown>>,
          pageConfig: {
            screenSize,
            autoWidth,
            selectedLayoutTemplateId,
          },
        },
      };

      if (isEditMode) {
        await updatePageDraft(currentPageId, payload);
      } else {
        await savePageDraft(payload);
      }

      setCurrentPageMeta({
        pageId,
        pageName,
      });
      emitApiAlert('保存成功', `${saveEntityLabel} ${pageName} 已保存`, 'success');
      setSaveDialogVisible(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="header-controls">
      <div className="header-left-control">
        <Radio.Group variant="default-filled" value={mode === 'component' ? '1' : '2'} onChange={handleChange}>
          <Radio.Button value="1">搭建{designLabel}</Radio.Button>
          <Radio.Button value="2">搭建流程</Radio.Button>
        </Radio.Group>
      </div>

      <div className="header-right-control">
        <Space>
          <div className="action-group">
            <Button
              theme="default"
              size="small"
              variant="outline"
              icon={<ArrowLeftIcon />}
              disabled={!canUndo}
              onClick={undo}
            >
              上一步
            </Button>
            <Button
              theme="default"
              size="small"
              variant="outline"
              icon={<ArrowRightIcon />}
              disabled={!canRedo}
              onClick={redo}
            >
              下一步
            </Button>
            <Button
              theme="default"
              size="small"
              variant="outline"
              icon={<HistoryIcon />}
              onClick={() => setHistoryVisible(true)}
            >
              操作历史
            </Button>
            <Button theme="primary" size="small" icon={<UploadIcon />} onClick={handleOpenSaveDialog}>保存</Button>
            <Button theme="default" size="small" icon={<ViewImageIcon />} onClick={handlePreview}>预览</Button>
          </div>
        </Space>
      </div>

      <Dialog
        visible={saveDialogVisible}
        header={`保存${saveEntityLabel}`}
        confirmBtn={{
          content: '确认保存',
          loading: saving,
        }}
        cancelBtn={{
          content: '取消',
          disabled: saving,
        }}
        closeOnOverlayClick={false}
        onConfirm={handleSave}
        onClose={handleCloseSaveDialog}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ marginBottom: 6 }}>{saveEntityLabel}名称</div>
            <Input
              value={componentName}
              placeholder={`请输入${saveEntityLabel}名称`}
              onChange={(value) => setComponentName(String(value ?? ''))}
              maxlength={60}
              clearable
            />
          </div>

          <div>
            <div style={{ marginBottom: 6 }}>{saveEntityLabel} ID</div>
            <Input
              value={componentId}
              placeholder="例如：user_profile_card"
              onChange={(value) => setComponentId(String(value ?? '').trim())}
              maxlength={64}
              clearable
              disabled={isEditMode}
            />
          </div>
        </div>
      </Dialog>

      <Drawer
        visible={historyVisible}
        header="操作历史"
        placement="right"
        size="560px"
        footer={false}
        onClose={() => setHistoryVisible(false)}
      >
        <div className="history-hero">
          <div className="history-hero-title">操作说明</div>
          <div className="history-hero-desc">点击任意历史节点可快速跳转到对应状态，顶部为最近操作。</div>
        </div>

        <div className="history-drawer-meta">
          <span>当前步：{history.pointer + 1}</span>
          <span>总步数：{history.actions.length}</span>
        </div>

        <div className="history-drawer-body">
          <Timeline mode="same" layout="vertical" labelAlign="left">
            {displayTimelineItems.map((item) => {
              const isCurrent = history.pointer === item.index;
              return (
                <Timeline.Item
                  key={item.index}
                  dotColor={isCurrent ? 'primary' : item.detail.theme}
                  label={`#${item.index + 1} · ${item.time}`}
                  content={
                    <div
                      className={`history-item history-card ${isCurrent ? 'is-current' : ''}`}
                      onClick={() => jumpToHistory(item.index)}
                    >
                      <div className="history-card-head">
                        <span className="history-card-title">{item.detail.title}</span>
                        <div className="history-card-tags">
                          <Tag size="small" theme={item.detail.theme} variant="light">{item.detail.kind}</Tag>
                          {isCurrent ? <Tag size="small" theme="primary" variant="light">当前</Tag> : null}
                        </div>
                      </div>
                      <div className="history-card-subtitle">{item.detail.subtitle}</div>
                      {item.detail.lines.map((line) => (
                        <div key={line} className="history-card-line">{line}</div>
                      ))}
                    </div>
                  }
                />
              );
            })}

            <Timeline.Item
              dotColor={history.pointer === -1 ? 'primary' : 'default'}
              label="初始"
              content={
                <div
                  className={`history-item history-card ${history.pointer === -1 ? 'is-current' : ''}`}
                  onClick={() => jumpToHistory(-1)}
                >
                  <div className="history-card-head">
                    <span className="history-card-title">初始状态</span>
                    {history.pointer === -1 ? <Tag size="small" theme="primary" variant="light">当前</Tag> : null}
                  </div>
                  <div className="history-card-line">编辑器初始快照</div>
                </div>
              }
            />
          </Timeline>
        </div>
      </Drawer>
    </div>
  );
};

export default HeaderControls;
