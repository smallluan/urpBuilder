import React from 'react';
import type { UiPreviewLibrary } from '../../config/uiPreviewLibrary';
import { SimulatorPreviewLibraryOverrideContext } from '../context/SimulatorPreviewLibraryOverrideContext';
import './SimulatorLibraryBrushOverlay.less';

export type SimulatorLibraryBrushRender = (library: UiPreviewLibrary) => React.ReactNode;

type Props = {
  /** 与 store 同步 */
  activeLibrary: UiPreviewLibrary;
  /** 主画布与嵌入式预览须使用不同 view-transition-name，避免同名冲突 */
  variant?: 'main' | 'embedded';
  children: SimulatorLibraryBrushRender;
};

/**
 * 模拟器内容区外壳：仅注入预览库 override。
 * 组件库切换动画由 document.startViewTransition + CSS（见 .less）完成，不再挂载双实例。
 */
const SimulatorLibraryBrushOverlay: React.FC<Props> = ({ activeLibrary, variant = 'main', children }) => {
  const vtClass =
    variant === 'embedded'
      ? 'urpbuilder-simulator-vt-surface urpbuilder-simulator-vt-surface--embedded'
      : 'urpbuilder-simulator-vt-surface urpbuilder-simulator-vt-surface--main';

  return (
    <div className={`simulator-library-brush-root ${vtClass}`}>
      <SimulatorPreviewLibraryOverrideContext.Provider value={activeLibrary}>
        {children(activeLibrary)}
      </SimulatorPreviewLibraryOverrideContext.Provider>
    </div>
  );
};

export default SimulatorLibraryBrushOverlay;
