import React, { useEffect, useState } from 'react';
import { Select } from 'tdesign-react';
import { useBuilderAccess, useBuilderContext } from '../context/BuilderContext';
import { PREVIEW_UI_LIBRARY_OPTIONS, type UiPreviewLibrary } from '../../config/uiPreviewLibrary';
import { runSimulatorViewTransition } from '../utils/simulatorViewTransition';

/**
 * 搭建画布工具栏右侧：预览组件库下拉（DSL 仍为 TDesign；扩展库时在 PREVIEW_UI_LIBRARY_OPTIONS 追加）。
 */
const PreviewUiLibraryToolbarSelect: React.FC = () => {
  const { useStore } = useBuilderContext();
  const { readOnly } = useBuilderAccess();
  const previewUiLibrary = useStore((s) => s.previewUiLibrary);
  const setPreviewUiLibrary = useStore((s) => s.setPreviewUiLibrary);
  const [selectValue, setSelectValue] = useState<UiPreviewLibrary>(previewUiLibrary);

  useEffect(() => {
    setSelectValue(previewUiLibrary);
  }, [previewUiLibrary]);

  return (
    <div className="preview-ui-library-toolbar-select">
      <span className="preview-ui-library-toolbar-select__label">组件库</span>
      <Select
        size="small"
        className="preview-ui-library-toolbar-select__control"
        value={selectValue}
        options={PREVIEW_UI_LIBRARY_OPTIONS}
        disabled={readOnly}
        onChange={(v) => {
          const next = String(v ?? '') as UiPreviewLibrary;
          if (next !== 'tdesign' && next !== 'antd') {
            return;
          }
          const current = useStore.getState().previewUiLibrary;
          if (next === current) {
            return;
          }
          setSelectValue(next);
          runSimulatorViewTransition(() => {
            setPreviewUiLibrary(next);
          });
        }}
        popupProps={{
          overlayClassName: 'preview-ui-library-toolbar-select__popup',
          zIndex: 5600,
        }}
      />
    </div>
  );
};

export default PreviewUiLibraryToolbarSelect;
