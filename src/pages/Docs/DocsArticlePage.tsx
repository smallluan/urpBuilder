import { Link, useParams } from 'react-router-dom';
import { MDXProvider } from '@mdx-js/react';
import { HELP_HOME, flattenNav, getAdjacentNavEntries } from './nav';
import {
  formatDocUpdatedAt,
  getDocMdxComponent,
  getDocMdxMeta,
  getDocMarkdownFallback,
} from './docSources';
import { docsMdxComponents } from './docsMdxComponents';
import { DocsMarkdown } from './components/DocsMarkdown';
import { DocArticleFooter } from './components/DocArticleFooter';
import { DocAnchorSidebar } from './components/DocAnchorSidebar';
import { useDocHeadings } from './hooks/useDocHeadings';

export default function DocsArticlePage() {
  const { sectionId, '*': slugPath } = useParams<{ sectionId: string; '*'?: string }>();
  const slug = (slugPath ?? '').replace(/^\/+|\/+$/g, '');
  const flat = flattenNav();
  const meta = flat.find((x) => x.sectionId === sectionId && x.slug === slug);
  const headings = useDocHeadings();

  if (!meta || !sectionId || !slug) {
    return (
      <div className="docs-page docs-page--single">
        <div className="doc-article-container">
          <div className="doc-article">
            <h1>未找到文档</h1>
            <p>
              <Link to={HELP_HOME}>返回帮助首页</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const Mdx = getDocMdxComponent(sectionId, slug);
  const { updatedAt } = getDocMdxMeta(sectionId, slug);
  const adjacent = getAdjacentNavEntries(sectionId, slug, flat);

  return (
    <div className={headings.length > 0 ? 'docs-page docs-page--with-anchor' : 'docs-page'}>
      <div className="doc-article-container">
        <article className="doc-article">
          <header className="doc-article__header">
            <p className="doc-article__section">{meta.sectionTitle}</p>
            {/* 有 MDX 时主标题由正文首行 # 提供，避免与 nav 里的 meta.title 重复渲染两个 h1 */}
            {!Mdx ? <h1>{meta.title}</h1> : null}
          </header>
          {Mdx ? (
            <MDXProvider components={docsMdxComponents}>
              <div className="urp-md">
                <Mdx />
              </div>
            </MDXProvider>
          ) : (
            <DocsMarkdown>{getDocMarkdownFallback(sectionId, slug, meta.title)}</DocsMarkdown>
          )}
          {Mdx && updatedAt ? (
            <p className="doc-article__updated">更新：{formatDocUpdatedAt(updatedAt)}</p>
          ) : null}
          <DocArticleFooter prev={adjacent.prev} next={adjacent.next} />
        </article>
      </div>
      <DocAnchorSidebar headings={headings} />
    </div>
  );
}
