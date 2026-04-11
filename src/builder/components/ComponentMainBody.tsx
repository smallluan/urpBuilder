import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, Divider, Input, Pagination, Popup, Select, Table, Typography } from 'tdesign-react';
import ComponentBody from '../renderer/ComponentBody';
import SCREEN_SIZES from '../config/screenSizes';
import { useBuilderAccess, useBuilderContext } from '../context/BuilderContext';
import { getBreakpointByWidth, resolveBuilderViewportWidth } from '../utils/gridResponsive';
import { Maximize2, Minimize2, Monitor, Settings2 } from 'lucide-react';
import { SimulatorAppearancePopupContent } from './SimulatorAppearancePopup';
import UnifiedBuilderTopbar, { TopbarGroup, TopbarIconButton } from './UnifiedBuilderTopbar';
import { BuilderSidebarToggles, useBuilderWorkbenchLayoutHotkeys } from './BuilderWorkbenchChrome';
import { useFullscreenControl } from '../hooks/useFullscreenControl';

const { Text } = Typography;

const BUILDER_SHORTCUT_ROWS: Array<{ id: string; desc: string; keys: string }> = [
  { id: 'mode-ui', desc: '切换到搭建 UI：', keys: 'Ctrl/Cmd+Shift+U' },
  { id: 'mode-flow', desc: '切换到搭建流程：', keys: 'Ctrl/Cmd+Shift+F' },
  { id: 'theme', desc: '切换浅色 / 深色主题（D = Dark）：', keys: 'Ctrl/Cmd+Shift+D' },
  { id: 'fullscreen', desc: '全屏 / 退出全屏（与工具栏「全屏」同步）：', keys: 'F11' },
  { id: 'tree-sub', desc: '结构树仅展示子树（右键菜单）：', keys: '展示为根节点' },
  { id: 'tree-root', desc: '结构树展示根 / 恢复整树：', keys: 'Ctrl/Cmd+Alt+R' },
  { id: 'copy', desc: '复制节点：', keys: 'Ctrl/Cmd+C' },
  { id: 'paste', desc: '粘贴节点：', keys: 'Ctrl/Cmd+V' },
  { id: 'cut', desc: '剪切节点：', keys: 'Ctrl/Cmd+X' },
  { id: 'del', desc: '删除节点：', keys: 'Ctrl/Cmd+Del' },
  { id: 'clear-children', desc: '清空子节点：', keys: 'Ctrl/Cmd+Shift+C' },
  { id: 'move-sibling', desc: '同级上移 / 下移：', keys: 'Ctrl/Cmd+↑ / ↓' },
  { id: 'move-end', desc: '同级置顶 / 置底：', keys: 'Ctrl/Cmd+Shift+↑ / ↓' },
  { id: 'undo', desc: '上一步：', keys: 'Ctrl/Cmd+Z' },
  { id: 'esc', desc: '退出（全局对话框）：', keys: 'Esc' },
  { id: 'sidebar-left', desc: '收起 / 展开左侧面板：', keys: 'Ctrl/Cmd+Shift+1' },
  { id: 'sidebar-right', desc: '收起 / 展开右侧面板：', keys: 'Ctrl/Cmd+Shift+2' },
  { id: 'topbar', desc: '收起 / 展开页面顶栏（保存/预览等）：', keys: 'Ctrl/Cmd+Shift+3' },
];

const SHORTCUT_TABLE_PAGE_SIZE = 8;

const ComponentMainBody: React.FC<{
  toolbarExtra?: React.ReactNode;
  /** 渲染在「快捷键」按钮之后，与 TopbarIconButton 风格一致 */
  toolbarAfterShortcuts?: React.ReactNode;
  toolbarRight?: React.ReactNode;
}> = ({
  toolbarExtra,
  toolbarAfterShortcuts,
  toolbarRight,
}) => {
  const { useStore } = useBuilderContext();
  const { readOnly } = useBuilderAccess();
  useBuilderWorkbenchLayoutHotkeys('component');
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreenControl();
  const screenSize = useStore((state) => state.screenSize);
  const autoWidth = useStore((state) => state.autoWidth);
  const setScreenSize = useStore((state) => state.setScreenSize);
  const setAutoWidth = useStore((state) => state.setAutoWidth);
  const simulatorChromeStyle = useStore((state) => state.simulatorChromeStyle);
  const setSimulatorChromeStyle = useStore((state) => state.setSimulatorChromeStyle);
  const inputDisabled = screenSize !== 'auto';
  const [draftInputValue, setDraftInputValue] = useState<string>(String(autoWidth));
  const [shortcutDialogVisible, setShortcutDialogVisible] = useState(false);
  const [shortcutTablePage, setShortcutTablePage] = useState(1);
  const [viewportPopupVisible, setViewportPopupVisible] = useState(false);
  const simulatorWidth = resolveBuilderViewportWidth(screenSize, autoWidth);
  const simulatorBreakpoint = getBreakpointByWidth(simulatorWidth);

  useEffect(() => {
    const nextValue = screenSize === 'auto' ? String(autoWidth) : String(Number(screenSize));
    setDraftInputValue((prev) => (prev === nextValue ? prev : nextValue));
  }, [screenSize, autoWidth]);

  useEffect(() => {
    if (shortcutDialogVisible) {
      setShortcutTablePage(1);
    }
  }, [shortcutDialogVisible]);

  const shortcutTablePageData = useMemo(() => {
    const start = (shortcutTablePage - 1) * SHORTCUT_TABLE_PAGE_SIZE;
    return BUILDER_SHORTCUT_ROWS.slice(start, start + SHORTCUT_TABLE_PAGE_SIZE);
  }, [shortcutTablePage]);

  const shortcutTableColumns = useMemo(
    () => [
      {
        colKey: 'desc',
        title: '',
        width: '58%',
        ellipsis: true,
        cell: ({ row }: { row: (typeof BUILDER_SHORTCUT_ROWS)[number] }) => row.desc,
      },
      {
        colKey: 'keys',
        title: '',
        align: 'right' as const,
        width: '42%',
        cell: ({ row }: { row: (typeof BUILDER_SHORTCUT_ROWS)[number] }) => <Text code>{row.keys}</Text>,
      },
    ],
    [],
  );

  const handleSelectChange = (value: string | number) => {
    if (readOnly) {
      return;
    }
    setScreenSize(value);
    if (value === 'auto') {
      setAutoWidth(1800);
    }
  };

  const handleInputBlur = (value: string) => {
    if (readOnly) {
      return;
    }

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
  const handleViewportPopupVisibleChange: NonNullable<React.ComponentProps<typeof Popup>['onVisibleChange']> = (
    visible,
    ctx,
  ) => {
    if (!visible && ctx.trigger === 'document' && ctx.e && 'target' in ctx.e) {
      const el = ctx.e.target as HTMLElement | null;
      if (el?.closest?.('.t-select__dropdown')) {
        return;
      }
    }
    setViewportPopupVisible(visible);
  };

  const viewportPopupContent = (
    <div className="builder-viewport-popup">
      <header className="builder-viewport-popup__header">
        <div className="builder-viewport-popup__header-stack">
          <span className="builder-viewport-popup__title">画布</span>
          <div className="builder-viewport-popup__header-meta-row">
            <div className="builder-viewport-popup__header-main">
              <span className="builder-viewport-popup__summary-value">
                {simulatorWidth}
                <span className="builder-viewport-popup__summary-unit">px</span>
              </span>
            </div>
            <span
              className={`builder-viewport-popup__bp-badge builder-viewport-popup__bp-badge--${simulatorBreakpoint}`}
              title="当前宽度对应的栅格断点"
            >
              {simulatorBreakpoint.toUpperCase()}
            </span>
          </div>
        </div>
      </header>
      <div className="builder-viewport-popup__body">
        <section className="builder-viewport-popup__section">
          <div className="builder-viewport-popup__section-head">
            <span className="builder-viewport-popup__section-title">设备预设</span>
          </div>
          <Select
            size="small"
            className="builder-viewport-popup__select"
            options={SCREEN_SIZES}
            value={screenSize}
            onChange={(value) => handleSelectChange(value as string | number)}
            disabled={readOnly}
            popupProps={{ overlayClassName: 'builder-viewport-popup__select-overlay', zIndex: 5600 }}
          />
        </section>

        <Divider layout="horizontal" className="builder-viewport-popup__divider" />

        <section className="builder-viewport-popup__section">
          <div className="builder-viewport-popup__section-head">
            <span className="builder-viewport-popup__section-title">自定义宽度</span>
            <span className="builder-viewport-popup__section-hint">
              {inputDisabled ? '请先选「自适应」' : '失焦生效'}
            </span>
          </div>
          <div className="builder-viewport-popup__width-row">
            <Input
              size="small"
              type="number"
              className="builder-viewport-popup__input"
              value={draftInputValue}
              disabled={readOnly || inputDisabled}
              placeholder={inputDisabled ? '—' : '宽度'}
              onChange={(value) => setDraftInputValue(String(value ?? ''))}
              onBlur={(value) => handleInputBlur(String(value ?? ''))}
            />
            <span className="builder-viewport-popup__width-suffix" aria-hidden>
              px
            </span>
          </div>
        </section>

        <Divider layout="horizontal" className="builder-viewport-popup__divider" />

        <section className="builder-viewport-popup__section">
          <div className="builder-viewport-popup__section-head">
            <span className="builder-viewport-popup__section-title">顶栏样式</span>
          </div>
          <Text className="builder-viewport-popup__section-note">
            固定宽度 ≤1024px。
          </Text>
          <SimulatorAppearancePopupContent
            embedded
            value={simulatorChromeStyle}
            onChange={setSimulatorChromeStyle}
            readOnly={readOnly}
          />
        </section>
      </div>
    </div>
  );

  return (
    <main className="main-body">
      <div className="component-main-toolbar">
        <UnifiedBuilderTopbar
          className="component-main-toolbar__row"
          left={(
            <>
              <BuilderSidebarToggles mode="component" />
              <TopbarGroup>
              <Popup
                visible={viewportPopupVisible}
                onVisibleChange={handleViewportPopupVisibleChange}
                trigger="click"
                placement="bottom-left"
                showArrow={false}
                overlayInnerClassName="builder-viewport-popup__panel"
                content={viewportPopupContent}
              >
                <TopbarIconButton
                  tip="画布尺寸、断点与手机顶栏样式"
                  label="画布"
                  icon={<Monitor size={16} strokeWidth={2} />}
                  disabled={readOnly}
                />
              </Popup>
              {toolbarExtra ? <div className="component-main-toolbar__extra-slot">{toolbarExtra}</div> : null}
              <TopbarIconButton
                tip="快捷键"
                label="快捷键"
                icon={<Settings2 size={16} strokeWidth={2} />}
                onClick={() => setShortcutDialogVisible(true)}
              />
              <TopbarIconButton
                tip={
                  isFullscreen
                    ? '退出全屏（Esc）'
                    : '全屏：隐藏浏览器页签与地址栏，与 F11 相同'
                }
                label="全屏"
                icon={isFullscreen ? <Minimize2 size={16} strokeWidth={2} /> : <Maximize2 size={16} strokeWidth={2} />}
                active={isFullscreen}
                onClick={toggleFullscreen}
              />
              {toolbarAfterShortcuts ? (
                <div className="component-main-toolbar__after-shortcuts">{toolbarAfterShortcuts}</div>
              ) : null}
            </TopbarGroup>
            </>
          )}
          right={toolbarRight ?? null}
        />
      </div>

      <div className="main-inner">
        <ComponentBody />
      </div>

      <Dialog
        visible={shortcutDialogVisible}
        header="快捷键"
        width="560px"
        confirmBtn="知道了（Esc）"
        cancelBtn={null}
        onConfirm={() => setShortcutDialogVisible(false)}
        onClose={() => setShortcutDialogVisible(false)}
      >
        <div className="builder-shortcut-dialog">
          <Table
            size="small"
            showHeader={false}
            rowKey="id"
            data={shortcutTablePageData}
            columns={shortcutTableColumns}
            bordered
          />
          <div className="builder-shortcut-dialog__pagination">
            <Pagination
              size="small"
              total={BUILDER_SHORTCUT_ROWS.length}
              current={shortcutTablePage}
              pageSize={SHORTCUT_TABLE_PAGE_SIZE}
              showJumper={false}
              onCurrentChange={setShortcutTablePage}
            />
          </div>
        </div>
      </Dialog>
    </main>
  );
};

export default React.memo(ComponentMainBody);
