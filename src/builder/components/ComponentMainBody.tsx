import React, { useEffect, useState } from 'react';
import { Button, Dialog, Input, Select, Tag, Tooltip } from 'tdesign-react';
import ComponentBody from '../renderer/ComponentBody';
import SCREEN_SIZES from '../config/screenSizes';
import { useBuilderAccess, useBuilderContext } from '../context/BuilderContext';
import { BUILT_IN_LAYOUT_TEMPLATES, type BuiltInLayoutTemplateId } from '../config/layoutTemplates';
import { getBreakpointByWidth, resolveBuilderViewportWidth } from '../utils/gridResponsive';
import { Layout, Settings2, RotateCcw } from 'lucide-react';
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
  const uiPageData = useStore((state) => state.uiPageData);
  const selectedLayoutTemplateId = useStore((state) => state.selectedLayoutTemplateId);
  const applyBuiltInLayoutTemplate = useStore((state) => state.applyBuiltInLayoutTemplate);

  const inputDisabled = screenSize !== 'auto';
  const [draftInputValue, setDraftInputValue] = useState<string>(String(autoWidth));
  const [layoutDialogVisible, setLayoutDialogVisible] = useState(false);
  const [shortcutDialogVisible, setShortcutDialogVisible] = useState(false);
  const [replaceConfirmVisible, setReplaceConfirmVisible] = useState(false);
  const [pendingTemplateId, setPendingTemplateId] = useState<BuiltInLayoutTemplateId | null>(null);
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

  const isPageEmpty = (uiPageData.children?.length ?? 0) === 0;

  const handleSelectLayoutTemplate = (templateId: BuiltInLayoutTemplateId) => {
    if (readOnly) {
      return;
    }

    if (isPageEmpty) {
      applyBuiltInLayoutTemplate(templateId);
      setLayoutDialogVisible(false);
      return;
    }

    setPendingTemplateId(templateId);
    setReplaceConfirmVisible(true);
  };

  const handleConfirmReplaceLayout = () => {
    if (!pendingTemplateId) {
      setReplaceConfirmVisible(false);
      return;
    }

    applyBuiltInLayoutTemplate(pendingTemplateId);
    setReplaceConfirmVisible(false);
    setLayoutDialogVisible(false);
    setPendingTemplateId(null);
  };

  return (
    <main className="main-body">
      <div className="component-main-toolbar">
        <UnifiedBuilderTopbar
          className="component-main-toolbar__row"
          left={(
            <TopbarGroup>
              <Select
                size='small'
                style={{ width: '120px' }}
                options={SCREEN_SIZES}
                value={screenSize}
                onChange={(value) => handleSelectChange(value as string | number)}
                disabled={readOnly}
              />
              <Input
                size='small'
                type="number"
                style={{ width: '80px' }}
                value={draftInputValue}
                disabled={readOnly || inputDisabled}
                onChange={(value) => setDraftInputValue(String(value ?? ''))}
                onBlur={(value) => handleInputBlur(String(value ?? ''))}
              />
              <Tag theme="primary" variant="light-outline">当前断点：{simulatorBreakpoint}</Tag>
              <div className="component-main-toolbar__preset">
                {WIDTH_PRESETS.map((preset) => (
                  <Button
                    key={preset.label}
                    size="small"
                    variant="text"
                    theme={screenSize === 'auto' && autoWidth === preset.width ? 'primary' : 'default'}
                    onClick={() => handleApplyWidthPreset(preset.width)}
                    disabled={readOnly}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              <TopbarIconButton
                tip="重置宽度为 1800"
                icon={<RotateCcw size={16} />}
                disabled={readOnly}
                onClick={() => {
                  setScreenSize('auto');
                  setAutoWidth(1800);
                }}
              />
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
              <Button
                size="small"
                theme="default"
                variant="outline"
                disabled={readOnly}
                icon={<Layout />}
                onClick={() => setLayoutDialogVisible(true)}
              />
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
          <div>全局能力：屏宽切换、自定义宽度、预设宽度、居中画布、回到顶部、布局模板。</div>
          <div>流程模式：Ctrl/Cmd+Shift+L / V / K。</div>
          <div>通用：Ctrl/Cmd+Z、Ctrl/Cmd+Shift+Z、Esc。</div>
          <div>节点级操作请在结构树或右键菜单中执行。</div>
        </div>
      </Dialog>

      <Dialog
        visible={layoutDialogVisible}
        width="820px"
        header="选择内置布局"
        className="layout-selector-dialog"
        footer={false}
        closeOnOverlayClick
        onClose={() => {
          setLayoutDialogVisible(false);
          setPendingTemplateId(null);
          setReplaceConfirmVisible(false);
        }}
      >
        <div className="layout-selector-headline">点击任一布局卡片即可应用到当前画布</div>
        <div className="layout-selector-grid">
          {BUILT_IN_LAYOUT_TEMPLATES.map((template) => {
            const isSelected = selectedLayoutTemplateId === template.id;
            return (
              <div
                key={template.id}
                className={`layout-template-card ${isSelected ? 'is-selected' : ''}`}
                onClick={() => handleSelectLayoutTemplate(template.id)}
              >
                <div className="layout-template-preview">
                  {template.previewLines.map((line, lineIndex) => {
                    const segments = line
                      .split('|')
                      .map((segment) => segment.trim())
                      .filter(Boolean);

                    return (
                      <div key={`${template.id}-${lineIndex}`} className="layout-template-preview-row">
                        {segments.map((segment) => (
                          <div key={`${template.id}-${lineIndex}-${segment}`} className="layout-template-preview-block">
                            {segment}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
                <div className="layout-template-meta">
                  <div className="layout-template-title">{template.name}</div>
                  <div className="layout-template-description">{template.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Dialog>

      <Dialog
        visible={replaceConfirmVisible}
        header="确认替换布局"
        confirmBtn="确认替换"
        cancelBtn="取消"
        closeOnOverlayClick={false}
        onConfirm={handleConfirmReplaceLayout}
        onClose={() => {
          setReplaceConfirmVisible(false);
          setPendingTemplateId(null);
        }}
      >
        当前页面存在内容，应用新布局将删除页面所有信息。是否确认继续？
      </Dialog>
    </main>
  );
};

export default React.memo(ComponentMainBody);
