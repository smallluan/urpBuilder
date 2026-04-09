import React from 'react';

/**
 * 返回当前搭建画布/嵌入式预览中模拟器滚动层 DOM，用于 Drawer、Popup、antd getContainer 等挂载点。
 * 避免 document.querySelector 命中页面中「第一个」滚动区导致错位或双实例叠两层。
 */
export const SimulatorScrollContainerContext = React.createContext<(() => HTMLElement) | null>(null);
