import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { TdAnchorItemProps } from 'tdesign-react/es/anchor/type';
import { assignHeadingIds } from '../utils/docHeadingId';

type HeadingNode = TdAnchorItemProps & {
  children?: HeadingNode[];
};

function buildHeadingTree(entries: Array<{ level: number; item: HeadingNode }>): HeadingNode[] {
  const root: HeadingNode[] = [];
  const stack: Array<{ level: number; item: HeadingNode }> = [];

  entries.forEach((entry) => {
    while (stack.length > 0 && stack[stack.length - 1].level >= entry.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(entry.item);
    } else {
      const parent = stack[stack.length - 1].item;
      parent.children = parent.children ?? [];
      parent.children.push(entry.item);
    }

    stack.push(entry);
  });

  return root;
}

export function useDocHeadings() {
  const location = useLocation();
  const [headings, setHeadings] = useState<HeadingNode[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const article = document.querySelector('.doc-article');
      const mdRoot = article?.querySelector('.urp-md');
      if (!article || !mdRoot) {
        setHeadings([]);
        return;
      }

      const headerH1 = article.querySelector<HTMLHeadingElement>('.doc-article__header h1');
      const mdHeadings = mdRoot.querySelectorAll<HTMLHeadingElement>('h1, h2, h3, h4, h5, h6');
      const idCount = new Map<string, number>();

      const forIds: HTMLHeadingElement[] = [];
      if (headerH1) {
        forIds.push(headerH1);
      }
      mdHeadings.forEach((h) => {
        forIds.push(h);
      });
      assignHeadingIds(forIds, idCount);

      const firstMdH1 = mdRoot.querySelector<HTMLHeadingElement>('h1');
      const skipDuplicateMdH1 =
        Boolean(headerH1 && firstMdH1 && firstMdH1.textContent?.trim() === headerH1.textContent?.trim());

      const entries: Array<{ level: number; item: HeadingNode }> = [];

      forIds.forEach((heading) => {
        if (skipDuplicateMdH1 && heading === firstMdH1) {
          return;
        }
        const level = Number(heading.tagName.slice(1));
        const text = heading.textContent?.trim() || '';
        if (!text || !heading.id) {
          return;
        }
        entries.push({
          level,
          item: {
            href: `#${heading.id}`,
            title: text,
          },
        });
      });

      setHeadings(buildHeadingTree(entries));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  return headings;
}
