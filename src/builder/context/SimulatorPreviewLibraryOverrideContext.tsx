import React from 'react';
import type { UiPreviewLibrary } from '../../config/uiPreviewLibrary';

/**
 * 搭建画布内覆盖「当前预览组件库」；未包裹时 {@link CommonComponent} 仍读 store。
 * 用于刷场过渡：底层 = from，顶层 = to。
 */
export const SimulatorPreviewLibraryOverrideContext = React.createContext<UiPreviewLibrary | undefined>(undefined);
