import React from 'react';

/**
 * 返回模拟器内"悬浮叠层"挂载 DOM（position: absolute，不随 scroll 内容滚动）。
 * Drawer / Dialog / Popup 等需要固定在视口中的组件应挂载到此节点，
 * 而非 `SimulatorScrollContainerContext` 所指向的滚动层。
 *
 * 结构关系：
 *   .simulator-container (position: relative; overflow: hidden)
 *     ├─ .simulator-scroll   ← 页面内容 / BackTop 挂载
 *     └─ .simulator-overlay-root  ← Drawer / Dialog / Popup 挂载（本 Context 指向此节点）
 */
export const SimulatorOverlayContainerContext = React.createContext<(() => HTMLElement) | null>(null);
