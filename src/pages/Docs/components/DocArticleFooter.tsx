import { Link } from 'react-router-dom';
import type { FlatNavEntry } from '../nav';

export function DocArticleFooter({
  prev,
  next,
}: {
  prev: FlatNavEntry | null;
  next: FlatNavEntry | null;
}) {
  if (!prev && !next) {
    return null;
  }

  return (
    <footer className="doc-article-footer">
      <nav className="doc-article-footer__nav" aria-label="文档上一篇与下一篇">
        <div className="doc-article-footer__side doc-article-footer__side--prev">
          {prev ? (
            <Link className="doc-article-footer__link" to={prev.path}>
              <span className="doc-article-footer__label">上一篇</span>
              <span className="doc-article-footer__title">{prev.title}</span>
            </Link>
          ) : (
            <span className="doc-article-footer__placeholder" aria-hidden />
          )}
        </div>
        <div className="doc-article-footer__side doc-article-footer__side--next">
          {next ? (
            <Link className="doc-article-footer__link doc-article-footer__link--next" to={next.path}>
              <span className="doc-article-footer__label">下一篇</span>
              <span className="doc-article-footer__title">{next.title}</span>
            </Link>
          ) : (
            <span className="doc-article-footer__placeholder" aria-hidden />
          )}
        </div>
      </nav>
    </footer>
  );
}
