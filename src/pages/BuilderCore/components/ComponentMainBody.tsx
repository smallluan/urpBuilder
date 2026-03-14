import React, { useEffect, useState } from 'react';
import { Button, Dialog, Input, Space, Select, Typography } from 'tdesign-react';
import ComponentBody from '../renderer/ComponentBody';
import SCREEN_SIZES from '../../CreateComponent/screenSizes';
import { useBuilderContext } from '../context/BuilderContext';
import { BUILT_IN_LAYOUT_TEMPLATES, type BuiltInLayoutTemplateId } from '../../CreateComponent/layoutTemplates';
import { getBreakpointByWidth, resolveBuilderViewportWidth } from '../utils/gridResponsive';

const { Text } = Typography;

const ComponentMainBody: React.FC = () => {
  const { useStore } = useBuilderContext();
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
  const [replaceConfirmVisible, setReplaceConfirmVisible] = useState(false);
  const [pendingTemplateId, setPendingTemplateId] = useState<BuiltInLayoutTemplateId | null>(null);
  const simulatorWidth = resolveBuilderViewportWidth(screenSize, autoWidth);
  const simulatorBreakpoint = getBreakpointByWidth(simulatorWidth);

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

  const isPageEmpty = (uiPageData.children?.length ?? 0) === 0;

  const handleSelectLayoutTemplate = (templateId: BuiltInLayoutTemplateId) => {
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
      <div
        style={{
          backgroundColor: 'white',
          padding: '8px',
          boxSizing: 'border-box',
          borderRadius: '4px',
        }}
      >
        <Space size={8} align="center">
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
          <Text style={{ fontSize: '12px', color: '#8b92a1' }}>当前断点：{simulatorBreakpoint}</Text>
          </Space>
          <Button
            size="medium"
            theme="default"
            variant="outline"
            onClick={() => setLayoutDialogVisible(true)}
          >
            选择布局
          </Button>
        </Space>
      </div>

      <div className="main-inner">
        <ComponentBody />
      </div>

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
