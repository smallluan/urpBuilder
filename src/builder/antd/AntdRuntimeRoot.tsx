import React from 'react';
import { App, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';

/**
 * 与 .create-body（横向 flex）衔接：App 根节点需占满剩余空间并成为纵向 flex 容器，
 * 否则内层 .mode-keepalive-host（子级为 absolute 画布）高度会塌成 0，页面只剩顶栏。
 */
const APP_SHELL_STYLE: React.CSSProperties = {
  flex: '1 1 auto',
  minHeight: 0,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
};

/**
 * 搭建画布与预览中 Ant Design 组件所需的上下文（主题、message/Modal 等 App 上下文）。
 * 与全站 TDesign 并存，仅包裹使用 antd 节点的区域。
 */
export function AntdRuntimeRoot({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider locale={zhCN}>
      <App style={APP_SHELL_STYLE}>{children}</App>
    </ConfigProvider>
  );
}
