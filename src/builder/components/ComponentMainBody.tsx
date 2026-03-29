import React, { useEffect, useState } from 'react';
import { Button, Dialog, Input, Popup, Select, Tooltip } from 'tdesign-react';
import ComponentBody from '../renderer/ComponentBody';
import SCREEN_SIZES from '../config/screenSizes';
import { useBuilderAccess, useBuilderContext } from '../context/BuilderContext';
import { getBreakpointByWidth, resolveBuilderViewportWidth } from '../utils/gridResponsive';
import { Monitor, RotateCcw, Settings2 } from 'lucide-react';
import UnifiedBuilderTopbar, { TopbarGroup, TopbarIconButton } from './UnifiedBuilderTopbar';

const WIDTH_PRESETS: Array<{ label: string; width: number }> = [
  { label: '手机', width: 390 },
  { label: '平板', width: 768 },
  { label: '桌面', width: 1200 },
];

const ComponentMainBody: React.FC<{ toolbarExtra?: React.ReactNode }> = ({ toolbarExtra }) => {
  const { useStore } = useBuilderContext();
  const { readOnly } = useBuilderAccess();
  const screenSize = useStore((state) => state.screenSize);
  const autoWidth = useStore((state) => state.autoWidth);
  const setScreenSize = useStore((state) => state.setScreenSize);
  const setAutoWidth = useStore((state) => state.setAutoWidth);
  const inputDisabled = screenSize !== 'auto';
  const [draftInputValue, setDraftInputValue] = useState<string>(String(autoWidth));
  const [shortcutDialogVisible, setShortcutDialogVisible] = useState(false);
  const [viewportPopupVisible, setViewportPopupVisible] = useState(false);
  const simulatorWidth = resolveBuilderViewportWidth(screenSize, autoWidth);
  const simulatorBreakpoint = getBreakpointByWidth(simulatorWidth);

  useEffect(() => {
    const nextValue = screenSize === 'auto' ? String(autoWidth) : String(Number(screenSize));
    setDraftInputValue((prev) => (prev === nextValue ? prev : nextValue));
  }, [screenSize, autoWidth]);

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

  const handleApplyWidthPreset = (width: number) => {
    if (readOnly) {
      return;
    }
    setScreenSize('auto');
    setAutoWidth(width);
  };

  const handleResetWidth = () => {
    if (readOnly) return;
    setScreenSize('auto');
    setAutoWidth(1800);
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
        <div className="builder-viewport-popup__header-main">
          <span className="builder-viewport-popup__title">画布尺寸</span>
          <span className="builder-viewport-popup__subtitle">模拟预览宽度与栅格断点</span>
        </div>
        <span
          className={`builder-viewport-popup__bp-badge builder-viewport-popup__bp-badge--${simulatorBreakpoint}`}
          title="当前宽度对应的栅格断点"
        >
          {simulatorBreakpoint.toUpperCase()}
        </span>
      </header>

      <div className="builder-viewport-popup__summary">
        <div className="builder-viewport-popup__summary-row">
          <span className="builder-viewport-popup__summary-label">有效宽度</span>
          <span className="builder-viewport-popup__summary-value">
            {simulatorWidth}
            <span className="builder-viewport-popup__summary-unit">px</span>
          </span>
        </div>
        <p className="builder-viewport-popup__summary-meta">
          {screenSize === 'auto'
            ? '自适应：可改下方数值或使用快捷端型'
            : `已锁定设备宽度 ${screenSize}px，与自定义宽度互斥`}
        </p>
      </div>

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

        <section className="builder-viewport-popup__section">
          <div className="builder-viewport-popup__section-head">
            <span className="builder-viewport-popup__section-title">快捷端型</span>
          </div>
          <div className="builder-viewport-popup__preset-grid" role="group" aria-label="快捷端型宽度">
            {WIDTH_PRESETS.map((preset) => {
              const active = screenSize === 'auto' && autoWidth === preset.width;
              return (
                <button
                  key={preset.label}
                  type="button"
                  className={`builder-viewport-popup__preset-cell${active ? ' is-active' : ''}`}
                  disabled={readOnly}
                  onClick={() => handleApplyWidthPreset(preset.width)}
                >
                  <span className="builder-viewport-popup__preset-name">{preset.label}</span>
                  <span className="builder-viewport-popup__preset-w">{preset.width}px</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <footer className="builder-viewport-popup__footer">
        <Button
          size="small"
          variant="outline"
          className="builder-viewport-popup__reset-btn"
          disabled={readOnly}
          icon={<RotateCcw size={14} />}
          onClick={handleResetWidth}
        >
          重置为自适应 1800px
        </Button>
      </footer>
    </div>
  );

  return (
    <main className="main-body">
      <div className="component-main-toolbar">
        <UnifiedBuilderTopbar
          className="component-main-toolbar__row"
          left={(
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
                  tip="画布尺寸"
                  icon={<Monitor size={16} strokeWidth={2} />}
                  disabled={readOnly}
                />
              </Popup>
            </TopbarGroup>
          )}
          right={(
            <TopbarGroup className="component-main-toolbar__extra">
              {toolbarExtra ? <div className="component-main-toolbar__extra-slot">{toolbarExtra}</div> : null}
              <Tooltip content="快捷键说明" placement="bottom">
                <Button size="small" variant="text" className="builder-topbar__icon-btn" onClick={() => setShortcutDialogVisible(true)}>
                  <Settings2 size={16} />
                </Button>
              </Tooltip>
            </TopbarGroup>
          )}
        />
      </div>

      <div className="main-inner">
        <ComponentBody />
      </div>

      <Dialog
        visible={shortcutDialogVisible}
        header="快捷键说明"
        confirmBtn="知道了"
        cancelBtn={null}
        onConfirm={() => setShortcutDialogVisible(false)}
        onClose={() => setShortcutDialogVisible(false)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>全局能力：点击工具栏左侧显示器图标调整画布尺寸；居中画布、回到顶部等。</div>
          <div>流程模式：Ctrl/Cmd+Shift+L / V / K。</div>
          <div>通用：Ctrl/Cmd+Z、Ctrl/Cmd+Shift+Z、Esc。</div>
          <div>节点级操作请在结构树或右键菜单中执行。</div>
        </div>
      </Dialog>
    </main>
  );
};

export default React.memo(ComponentMainBody);
