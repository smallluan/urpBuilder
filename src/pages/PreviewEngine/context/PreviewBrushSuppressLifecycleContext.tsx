import React from 'react';

/** 刷场底层镜像树不向外派发预览生命周期，避免双实例重复触发 */
export const PreviewBrushSuppressLifecycleContext = React.createContext(false);
