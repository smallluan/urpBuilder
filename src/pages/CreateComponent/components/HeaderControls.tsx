import React, { useMemo, useState } from 'react';
import { Radio, Button, Space, Drawer, Timeline, Tag } from 'tdesign-react';
import { ArrowLeftIcon, ArrowRightIcon, AnticlockwiseIcon, UploadIcon, ViewImageIcon, HistoryIcon } from 'tdesign-icons-react';
import type { UiHistoryAction } from '../store/type';

type Props = {
  mode: 'component' | 'flow';
  onChange: (v: 'component' | 'flow') => void;
  onUndo: () => void;
  onRedo: () => void;
  onJumpToHistory: (pointer: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  historyPointer: number;
  historyActions: UiHistoryAction[];
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
      lines: [
        `父节点：${action.parentKey}`,
        `插入位置：${action.index}`,
      ],
    };
  }
  if (action.type === 'remove') {
    return {
      title: `删除组件：${action.nodeLabel}`,
      subtitle: `${action.nodeType || '未知类型'} · ${action.nodeKey}`,
      theme: 'danger' as const,
      kind: '删除',
      lines: [
        `原父节点：${action.parentKey}`,
        `原位置：${action.index}`,
      ],
    };
  }
  if (action.type === 'update-label') {
    return {
      title: `修改组件名称：${action.nextLabel}`,
      subtitle: `${action.nodeType || '未知类型'} · ${action.nodeKey}`,
      theme: 'primary' as const,
      kind: '改名',
      lines: [
        `旧名称：${action.prevLabel}`,
        `新名称：${action.nextLabel}`,
      ],
    };
  }

  return {
    title: `修改属性：${action.propKey}`,
    subtitle: `${action.nodeLabel}（${action.nodeType || '未知类型'}） · ${action.nodeKey}`,
    theme: 'warning' as const,
    kind: '改属性',
    lines: [
      `旧值：${toReadableValue(action.prevValue)}`,
      `新值：${toReadableValue(action.nextValue)}`,
    ],
  };
};

const HeaderControls: React.FC<Props> = ({
  mode,
  onChange,
  onUndo,
  onRedo,
  onJumpToHistory,
  canUndo,
  canRedo,
  historyPointer,
  historyActions,
}) => {
  const [historyVisible, setHistoryVisible] = useState(false);

  const handleChange = (value: any) => {
    onChange(String(value) === '1' ? 'component' : 'flow');
  };

  const timelineItems = useMemo(
    () =>
      historyActions.map((action, index) => ({
        index,
        time: new Date(action.timestamp).toLocaleTimeString('zh-CN', { hour12: false }),
        detail: toActionDescription(action),
      })),
    [historyActions],
  );

  const displayTimelineItems = useMemo(() => [...timelineItems].reverse(), [timelineItems]);

  return (
    <>
      <div className="header-controls">
        <div className="header-left-control">
          <Radio.Group variant="default-filled" value={mode === 'component' ? '1' : '2'} onChange={handleChange}>
            <Radio.Button value="1">搭建组件</Radio.Button>
            <Radio.Button value="2">搭建流程</Radio.Button>
          </Radio.Group>
        </div>

        <div className="header-right-control">
          <Space>
              <div className="nav-group">
                <Button
                  theme="default"
                  variant="text"
                  size="small"
                  icon={<ArrowLeftIcon />}
                  disabled={!canUndo}
                  onClick={onUndo}
                >
                  上一步
                </Button>
                <span className="divider" />
                <Button
                  theme="default"
                  variant="text"
                  size="small"
                  icon={<AnticlockwiseIcon />}
                  disabled={!canRedo}
                  onClick={onRedo}
                >
                  重做
                </Button>
                <span className="divider" />
                <Button
                  theme="default"
                  variant="text"
                  size="small"
                  icon={<ArrowRightIcon />}
                  disabled={!canRedo}
                  onClick={onRedo}
                >
                  下一步
                </Button>
                <span className="divider" />
                <Button
                  theme="default"
                  variant="text"
                  size="small"
                  icon={<HistoryIcon />}
                  onClick={() => setHistoryVisible(true)}
                >
                  操作历史
                </Button>
              </div>

              <div className="action-group">
                <Button theme="primary" size="small" icon={<UploadIcon />}>保存</Button>
                <Button theme="default" size="small" icon={<ViewImageIcon />}>预览</Button>
              </div>
          </Space>
        </div>
      </div>

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
          <span>当前步：{historyPointer + 1}</span>
          <span>总步数：{historyActions.length}</span>
        </div>

        <div className="history-drawer-body">
          <Timeline mode="same" layout="vertical" labelAlign="left">
            {displayTimelineItems.map((item) => {
              const isCurrent = historyPointer === item.index;
              return (
                <Timeline.Item
                  key={item.index}
                  dotColor={isCurrent ? 'primary' : item.detail.theme}
                  label={`#${item.index + 1} · ${item.time}`}
                  content={
                    <div
                      className={`history-item history-card ${isCurrent ? 'is-current' : ''}`}
                      onClick={() => onJumpToHistory(item.index)}
                    >
                      <div className="history-card-head">
                        <span className="history-card-title">{item.detail.title}</span>
                        <div className="history-card-tags">
                          <Tag size="small" theme={item.detail.theme} variant="light">{item.detail.kind}</Tag>
                          {isCurrent ? <Tag size="small" theme="primary" variant="light">当前</Tag> : null}
                        </div>
                      </div>
                      {'subtitle' in item.detail ? <div className="history-card-subtitle">{item.detail.subtitle}</div> : null}
                      {item.detail.lines.map((line) => (
                        <div key={line} className="history-card-line">{line}</div>
                      ))}
                    </div>
                  }
                />
              );
            })}

            <Timeline.Item
              dotColor={historyPointer === -1 ? 'primary' : 'default'}
              label="初始"
              content={
                <div
                  className={`history-item history-card ${historyPointer === -1 ? 'is-current' : ''}`}
                  onClick={() => onJumpToHistory(-1)}
                >
                  <div className="history-card-head">
                    <span className="history-card-title">初始状态</span>
                    {historyPointer === -1 ? <Tag size="small" theme="primary" variant="light">当前</Tag> : null}
                  </div>
                  <div className="history-card-line">编辑器初始快照</div>
                </div>
              }
            />
          </Timeline>
        </div>
      </Drawer>
    </>
  );
};

export default HeaderControls;
