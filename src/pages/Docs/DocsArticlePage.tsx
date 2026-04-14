import { Link, useParams } from 'react-router-dom';
import { MDXProvider } from '@mdx-js/react';
import { HELP_HOME, flattenNav } from './nav';
import { getDocMdxComponent, getDocMarkdownFallback } from './docSources';
import { docsMdxComponents } from './docsMdxComponents';
import { DocsMarkdown } from './components/DocsMarkdown';

export default function DocsArticlePage() {
  const { sectionId, '*': slugPath } = useParams<{ sectionId: string; '*'?: string }>();
  const slug = (slugPath ?? '').replace(/^\/+|\/+$/g, '');
  const flat = flattenNav();
  const meta = flat.find((x) => x.sectionId === sectionId && x.slug === slug);

  if (!meta || !sectionId || !slug) {
    return (
      <div className="doc-article">
        <h1>未找到文档</h1>
        <p>
          <Link to={HELP_HOME}>返回帮助首页</Link>
        </p>
      </div>
    );
  }

  const Mdx = getDocMdxComponent(sectionId, slug);

  return (
    <article className="doc-article">
      <header className="doc-article__header">
        <p className="doc-article__section">{meta.sectionTitle}</p>
        <h1>{meta.title}</h1>
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
    </article>
  );
}
