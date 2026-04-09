import React from 'react';

/**
 * 预览里 Drawer / Dialog / Popup / antd getContainer 的挂载根节点。
 * 嵌入式预览须指向模拟器滚动层；独立预览页可为 body。
 */
export const PreviewPortalContainerContext = React.createContext<(() => HTMLElement) | null>(null);
