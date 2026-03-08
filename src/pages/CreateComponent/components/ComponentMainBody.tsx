import React, { useEffect, useState } from 'react';
import { Input, Space, Select, Typography, Button, Drawer, Timeline, Tag } from 'tdesign-react';
import { ArrowLeftIcon, ArrowRightIcon, AnticlockwiseIcon, HistoryIcon } from 'tdesign-icons-react';
import ComponentBody from '../ComponentBody';
import SCREEN_SIZES from '../screenSizes';
import { useCreateComponentStore } from '../store';
import type { UiHistoryAction } from '../store/type';

const { Text } = Typography;

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

  return {
    title: `修改属性：${action.propKey}`,
    subtitle: `${action.nodeLabel}（${action.nodeType || '未知类型'}） · ${action.nodeKey}`,
    theme: 'warning' as const,
    kind: '改属性',
    lines: [`旧值：${toReadableValue(action.prevValue)}`, `新值：${toReadableValue(action.nextValue)}`],
  };
};

const ComponentMainBody: React.FC = () => {
  const screenSize = useCreateComponentStore((state) => state.screenSize);
  const autoWidth = useCreateComponentStore((state) => state.autoWidth);
  const setScreenSize = useCreateComponentStore((state) => state.setScreenSize);
  const setAutoWidth = useCreateComponentStore((state) => state.setAutoWidth);
  const history = useCreateComponentStore((state) => state.history);
  const undo = useCreateComponentStore((state) => state.undo);
  const redo = useCreateComponentStore((state) => state.redo);
  const jumpToHistory = useCreateComponentStore((state) => state.jumpToHistory);

  const inputDisabled = screenSize !== 'auto';
  const [draftInputValue, setDraftInputValue] = useState<string>(String(autoWidth));
  const [historyVisible, setHistoryVisible] = useState(false);

  const canUndo = history.pointer >= 0;
  const canRedo = history.pointer < history.actions.length - 1;

  const timelineItems = history.actions.map((action, index) => ({
    index,
    time: new Date(action.timestamp).toLocaleTimeString('zh-CN', { hour12: false }),
    detail: toActionDescription(action),
  }));

  const displayTimelineItems = [...timelineItems].reverse();

  useEffect(() => {
    const nextValue = screenSize === 'auto' ? String(autoWidth) : String(Number(screenSize));
    setDraftInputValue((prev) => (prev === nextValue ? prev : nextValue));
  }, [screenSize, autoWidth]);

  const handleSelectChange = (value: string | number) => {
    setScreenSize(value);
    if (value === 'auto') {
      setAutoWidth(1800);
    }
  };

  const handleInputBlur = (value: string) => {
    if (screenSize !== 'auto') {
      return;
    }

    const nextWidth = Number(value);
    if (!Number.isNaN(nextWidth) && nextWidth > 0 && nextWidth !== autoWidth) {
      setAutoWidth(nextWidth);
      return;
    }

    setDraftInputValue(String(autoWidth));
  };

  return (
    <main className="main-body">
      <div
        style={{
          backgroundColor: 'white',
          padding: '8px',
          boxSizing: 'border-box',
          borderRadius: '4px',
        }}
      >
        <Space size={8} align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space size={8} align="center">
          <Text style={{ fontSize: '12px' }}>开发尺寸：</Text>
          <Select
            style={{ width: '200px' }}
            options={SCREEN_SIZES}
            value={screenSize}
            onChange={(value) => handleSelectChange(value as string | number)}
          />
          <Input
            type="number"
            style={{ width: '100px' }}
            value={draftInputValue}
            disabled={inputDisabled}
            onChange={(value) => setDraftInputValue(String(value ?? ''))}
            onBlur={(value) => handleInputBlur(String(value ?? ''))}
          />
          </Space>

          <div className="component-body-nav-group">
            <Button
              theme="default"
              variant="text"
              size="small"
              icon={<ArrowLeftIcon />}
              disabled={!canUndo}
              onClick={undo}
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
              onClick={redo}
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
              onClick={redo}
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
        </Space>
      </div>

      <div className="main-inner">
        <ComponentBody />
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
    </main>
  );
};

export default React.memo(ComponentMainBody);
