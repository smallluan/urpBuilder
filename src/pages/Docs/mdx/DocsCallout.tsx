import type { ReactNode } from 'react';

/** 文档 MDX 内可引用的轻量提示块（示例：内嵌 React） */
export function DocsCallout({ title, children }: { title?: string; children?: ReactNode }) {
  return (
    <aside className="urp-md__mdx-callout">
      {title ? <div className="urp-md__mdx-callout-title">{title}</div> : null}
      <div className="urp-md__mdx-callout-body">{children}</div>
    </aside>
  );
}
