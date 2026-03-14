/**
 * BuilderShell —— Builder 页面通用外壳。
 *
 * 提供标准的"顶部 header + 内容区域"骨架，内容区域由调用方通过 children 填充。
 * CreateComponent 的 ComponentLayout / FlowLayout 作为 children 传入，
 * CreatePage 同理，可传入自己的布局组件，无需修改此 Shell。
 *
 * 样式由 builder/style.less 统一提供（create-page / create-header）。
 */

import React from 'react';
import '../style.less';

export interface BuilderShellProps {
  /** 顶部 header 区域内容（如 HeaderControls） */
  header: React.ReactNode;
  /** 主内容区域（如 ComponentLayout / FlowLayout） */
  children: React.ReactNode;
  /** 根节点额外 class（默认 'create-page'） */
  className?: string;
}

export const BuilderShell: React.FC<BuilderShellProps> = ({
  header,
  children,
  className = 'create-page',
}) => (
  <div className={className}>
    <header className="create-header">{header}</header>
    <div className="create-body">{children}</div>
  </div>
);
