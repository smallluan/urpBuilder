import React, { useEffect, useState } from 'react';
import { Dialog, Divider, Input, Popup, Row, Select, Space, Typography } from 'tdesign-react';
import ComponentBody from '../renderer/ComponentBody';
import SCREEN_SIZES from '../config/screenSizes';
import { useBuilderAccess, useBuilderContext } from '../context/BuilderContext';
import { getBreakpointByWidth, resolveBuilderViewportWidth } from '../utils/gridResponsive';
import { Monitor, Settings2 } from 'lucide-react';
import { SimulatorAppearancePopupContent } from './SimulatorAppearancePopup';
import UnifiedBuilderTopbar, { TopbarGroup, TopbarIconButton } from './UnifiedBuilderTopbar';
import { BuilderSidebarToggles } from './BuilderWorkbenchChrome';

const { Text } = Typography;

const ComponentMainBody: React.FC<{ toolbarExtra?: React.ReactNode }> = ({ toolbarExtra }) => {
  const { useStore } = useBuilderContext();
  const { readOnly } = useBuilderAccess();
  const screenSize = useStore((state) => state.screenSize);
  const autoWidth = useStore((state) => state.autoWidth);
  const setScreenSize = useStore((state) => state.setScreenSize);
  const setAutoWidth = useStore((state) => state.setAutoWidth);
  const simulatorChromeStyle = useStore((state) => state.simulatorChromeStyle);
  const setSimulatorChromeStyle = useStore((state) => state.setSimulatorChromeStyle);
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
            </TopbarGroup>
            </>
          )}
        />
      </div>

      <div className="main-inner">
        <ComponentBody />
      </div>

      <Dialog
        visible={shortcutDialogVisible}
        header="快捷键"
        confirmBtn="知道了（Esc）"
        cancelBtn={null}
        onConfirm={() => setShortcutDialogVisible(false)}
        onClose={() => setShortcutDialogVisible(false)}
      >
        <Space size={4} style={{ width: '100%', height: '400px', overflow: 'auto' }} direction="vertical">
          <Row justify="space-between" align="middle">
            <div>切换到搭建 UI：</div>
            <Text code>Ctrl/Cmd+Shift+U</Text>
          </Row>
          <Row justify="space-between" align="middle">
            <div>切换到搭建流程：</div>
            <Text code>Ctrl/Cmd+Shift+F</Text>
          </Row>
          <Row justify="space-between" align="middle">
            <div>切换浅色 / 深色主题（D = Dark）：</div>
            <Text code>Ctrl/Cmd+Shift+D</Text>
          </Row>
          <Row justify="space-between" align="middle">
            <div>结构树仅展示子树（右键菜单）：</div>
            <Text code>展示为根节点</Text>
          </Row>
          <Row justify="space-between" align="middle">
            <div>结构树展示根 / 恢复整树：</div>
            <Text code>Ctrl/Cmd+Alt+R</Text>
          </Row>  
          <Row justify="space-between" align="middle">
            <div>复制节点：</div>
            <Text code>Ctrl/Cmd+C</Text>
          </Row>
          <Row justify="space-between" align="middle">
            <div>粘贴节点：</div>
            <Text code>Ctrl/Cmd+V</Text>
          </Row>
          <Row justify="space-between" align="middle">
            <div>剪切节点：</div>
            <Text code>Ctrl/Cmd+X</Text>
          </Row>
          <Row justify="space-between" align="middle">
            <div>删除节点：</div>
            <Text code>Ctrl/Cmd+Del </Text>
          </Row>
          <Row justify="space-between" align="middle">
            <div>清空子节点：</div>
            <Text code>Ctrl/Cmd+Shift+C</Text>
          </Row>
          <Row justify="space-between" align="middle">
            <div>同级上移 / 下移：</div>
            <Text code>Ctrl/Cmd+↑ / ↓</Text>
          </Row>
          <Row justify="space-between" align="middle">
            <div>同级置顶 / 置底：</div>
            <Text code>Ctrl/Cmd+Shift+↑ / ↓</Text>
          </Row>
          <Row justify="space-between" align="middle">
            <div>上一步：</div>
            <Text code>Ctrl/Cmd+Z </Text>
          </Row>
          <Row justify="space-between" align="middle">
            <div>退出（全局对话框）：</div>
            <Text code>Esc </Text>
          </Row>
        </Space>
      </Dialog>
    </main>
  );
};

export default React.memo(ComponentMainBody);
