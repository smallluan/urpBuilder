import React, { useEffect, useRef, useState } from 'react';
import { MessagePlugin, Select } from 'tdesign-react';
import type { MessageInstance } from 'tdesign-react/es/message/type';
import { useBuilderAccess, useBuilderContext } from '../context/BuilderContext';
import { PREVIEW_UI_LIBRARY_OPTIONS, type UiPreviewLibrary } from '../../config/uiPreviewLibrary';
import {
  endSimulatorLibraryTransitionRun,
  startSimulatorLibraryTransitionRun,
} from '../utils/simulatorViewTransition';

/**
 * 搭建画布工具栏右侧：预览组件库下拉（DSL 仍为 TDesign；扩展库时在 PREVIEW_UI_LIBRARY_OPTIONS 追加）。
 */
const PreviewUiLibraryToolbarSelect: React.FC = () => {
  const { useStore } = useBuilderContext();
  const { readOnly } = useBuilderAccess();
  const previewUiLibrary = useStore((s) => s.previewUiLibrary);
  const [selectValue, setSelectValue] = useState<UiPreviewLibrary>(previewUiLibrary);
  const librarySwitchLoadingRef = useRef<Promise<MessageInstance> | null>(null);

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
          const state = useStore.getState();
          const { previewUiLibrary: committed, simulatorLibraryTransition } = state;

          if (simulatorLibraryTransition) {
            if (next === simulatorLibraryTransition.to) {
              return;
            }
            if (next === committed) {
              setSelectValue(committed);
              state.cancelSimulatorLibraryTransition();
              endSimulatorLibraryTransitionRun('aborted');
              return;
            }
          }

          if (next === committed && !simulatorLibraryTransition) {
            return;
          }

          setSelectValue(next);
          const runPromise = startSimulatorLibraryTransitionRun();
          state.beginSimulatorLibraryTransition(next);

          const prevLoading = librarySwitchLoadingRef.current;
          if (prevLoading) {
            MessagePlugin.close(prevLoading);
            librarySwitchLoadingRef.current = null;
          }
          const loadingMsg = MessagePlugin.loading({ content: '组件库切换中…', duration: 0 });
          librarySwitchLoadingRef.current = loadingMsg;
          void runPromise.then((outcome) => {
            if (librarySwitchLoadingRef.current === loadingMsg) {
              MessagePlugin.close(loadingMsg);
              librarySwitchLoadingRef.current = null;
            }
            if (outcome === 'completed') {
              MessagePlugin.success('组件库切换成功');
            }
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
