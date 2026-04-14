import { Anchor } from 'tdesign-react';
import type { TdAnchorItemProps } from 'tdesign-react/es/anchor/type';

type HeadingNode = TdAnchorItemProps & {
  children?: HeadingNode[];
};

interface DocAnchorSidebarProps {
  headings: HeadingNode[];
}

function DocAnchorItems({ items }: { items: HeadingNode[] }) {
  return (
    <>
      {items.map((item, i) => (
        <Anchor.AnchorItem key={item.href ?? String(i)} href={item.href!} title={item.title}>
          {item.children && item.children.length > 0 ? <DocAnchorItems items={item.children} /> : null}
        </Anchor.AnchorItem>
      ))}
    </>
  );
}

export function DocAnchorSidebar({ headings }: DocAnchorSidebarProps) {
  if (headings.length === 0) {
    return null;
  }

  return (
    <aside className="doc-anchor-column" aria-label="当前页目录">
      <div className="doc-anchor-column__sticky">
        <div className="doc-anchor-column__inner">
          <Anchor
            size="small"
            bounds={140}
            targetOffset={96}
            container={() => document.querySelector('.docs-main') as HTMLElement}
          >
            <DocAnchorItems items={headings} />
          </Anchor>
        </div>
      </div>
    </aside>
  );
}
