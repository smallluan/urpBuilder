import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { docsMdxComponents } from '../docsMdxComponents';

export type DocsMarkdownProps = {
  /** Markdown 源码（占位稿或未迁 MDX 的章节） */
  children: string;
  className?: string;
};

/** 纯 Markdown 渲染（与 MDX 共用 docsMdxComponents 样式） */
export function DocsMarkdown({ children, className }: DocsMarkdownProps) {
  return (
    <div className={['urp-md', className].filter(Boolean).join(' ')}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={docsMdxComponents}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
