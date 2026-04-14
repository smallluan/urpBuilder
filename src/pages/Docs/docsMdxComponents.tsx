import { Children, isValidElement } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { MDXComponents } from 'mdx/types.js';
import './components/docs-markdown.less';

function mergeClass(base: string, extra?: string): string {
  return extra ? `${base} ${extra}` : base;
}

function languageFromPreChildren(children: ReactNode): string {
  try {
    const only = Children.only(children);
    if (!isValidElement(only)) return '';
    const cls = String((only.props as { className?: string }).className ?? '');
    const m = /language-(\w+)/.exec(cls);
    return m ? m[1] : '';
  } catch {
    return '';
  }
}

const FILENAME_BY_LANG: Record<string, string> = {
  html: 'index.html',
  xml: 'file.xml',
  css: 'style.css',
  scss: 'style.scss',
  less: 'style.less',
  javascript: 'index.js',
  js: 'index.js',
  jsx: 'App.jsx',
  typescript: 'index.ts',
  ts: 'index.ts',
  tsx: 'App.tsx',
  json: 'package.json',
  bash: 'script.sh',
  shell: 'script.sh',
  sh: 'script.sh',
  md: 'README.md',
  markdown: 'README.md',
  yaml: 'config.yaml',
  yml: 'config.yml',
  rust: 'main.rs',
  python: 'main.py',
  py: 'main.py',
  vue: 'App.vue',
  sql: 'query.sql',
  diff: 'changes.diff',
  http: 'request.http',
};

function codeWindowFilename(lang: string): string {
  const key = lang.toLowerCase();
  if (!key) return 'code.txt';
  return FILENAME_BY_LANG[key] ?? `snippet.${key}`;
}

/** 供 react-markdown 与 MDXProvider 共用，保证 MD / MDX 视觉一致 */
export const docsMdxComponents: MDXComponents = {
  h1: ({ children, className, ...props }) => (
    <h1 className={mergeClass('urp-md__h1', className)} {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, className, ...props }) => (
    <h2 className={mergeClass('urp-md__h2', className)} {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, className, ...props }) => (
    <h3 className={mergeClass('urp-md__h3', className)} {...props}>
      {children}
    </h3>
  ),
  h4: ({ children, className, ...props }) => (
    <h4 className={mergeClass('urp-md__h4', className)} {...props}>
      {children}
    </h4>
  ),
  h5: ({ children, className, ...props }) => (
    <h5 className={mergeClass('urp-md__h5', className)} {...props}>
      {children}
    </h5>
  ),
  h6: ({ children, className, ...props }) => (
    <h6 className={mergeClass('urp-md__h6', className)} {...props}>
      {children}
    </h6>
  ),
  p: ({ children, className, ...props }) => (
    <p className={mergeClass('urp-md__p', className)} {...props}>
      {children}
    </p>
  ),
  a: ({ href, children, className, ...props }) => {
    const cn = mergeClass('urp-md__a', className);
    const internal = Boolean(href && href.startsWith('/') && !href.startsWith('//'));
    if (internal) {
      return (
        <Link className={cn} to={href!} {...props}>
          {children}
        </Link>
      );
    }
    return (
      <a className={cn} href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  },
  ul: ({ children, className, ...props }) => (
    <ul className={mergeClass('urp-md__ul', className)} {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, className, ...props }) => (
    <ol className={mergeClass('urp-md__ol', className)} {...props}>
      {children}
    </ol>
  ),
  li: ({ children, className, ...props }) => (
    <li className={mergeClass('urp-md__li', className)} {...props}>
      {children}
    </li>
  ),
  blockquote: ({ children, className, ...props }) => (
    <blockquote className={mergeClass('urp-md__blockquote', className)} {...props}>
      {children}
    </blockquote>
  ),
  hr: ({ className, ...props }) => <hr className={mergeClass('urp-md__hr', className)} {...props} />,
  table: ({ children, className, ...props }) => (
    <div className="urp-md__table-scroll">
      <table className={mergeClass('urp-md__table', className)} {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, className, ...props }) => (
    <thead className={mergeClass('urp-md__thead', className)} {...props}>
      {children}
    </thead>
  ),
  tbody: ({ children, className, ...props }) => (
    <tbody className={mergeClass('urp-md__tbody', className)} {...props}>
      {children}
    </tbody>
  ),
  tr: ({ children, className, ...props }) => (
    <tr className={mergeClass('urp-md__tr', className)} {...props}>
      {children}
    </tr>
  ),
  th: ({ children, className, ...props }) => (
    <th className={mergeClass('urp-md__th', className)} {...props}>
      {children}
    </th>
  ),
  td: ({ children, className, ...props }) => (
    <td className={mergeClass('urp-md__td', className)} {...props}>
      {children}
    </td>
  ),
  strong: ({ children, className, ...props }) => (
    <strong className={mergeClass('urp-md__strong', className)} {...props}>
      {children}
    </strong>
  ),
  em: ({ children, className, ...props }) => (
    <em className={mergeClass('urp-md__em', className)} {...props}>
      {children}
    </em>
  ),
  del: ({ children, className, ...props }) => (
    <del className={mergeClass('urp-md__del', className)} {...props}>
      {children}
    </del>
  ),
  img: ({ src, alt, className, ...props }) => (
    <img
      className={mergeClass('urp-md__img', className)}
      src={src}
      alt={alt ?? ''}
      loading="lazy"
      decoding="async"
      {...props}
    />
  ),
  code: (props) => {
    const { children, className, ...rest } = props;
    const { inline: _i, node: _n, ...domRest } = rest as typeof rest & { inline?: boolean; node?: unknown };
    const inline = Boolean((props as { inline?: boolean }).inline);
    if (inline) {
      return (
        <code className={mergeClass('urp-md__code-inline', className)} {...domRest}>
          {children}
        </code>
      );
    }
    return (
      <code className={className} {...domRest}>
        {children}
      </code>
    );
  },
  pre: ({ children, className, ...props }) => {
    const lang = languageFromPreChildren(children);
    const title = codeWindowFilename(lang);
    return (
      <div className="urp-md__code-window">
        <div className="urp-md__code-window-chrome">
          <span className="urp-md__code-window-dots" aria-hidden>
            <span className="urp-md__code-window-dot urp-md__code-window-dot--r" />
            <span className="urp-md__code-window-dot urp-md__code-window-dot--y" />
            <span className="urp-md__code-window-dot urp-md__code-window-dot--g" />
          </span>
          <span className="urp-md__code-window-title">{title}</span>
        </div>
        <pre className={mergeClass('urp-md__code-window-body', className)} {...props}>
          {children}
        </pre>
      </div>
    );
  },
  input: ({ type, checked, className, ...props }) => {
    if (type === 'checkbox') {
      return (
        <input
          type="checkbox"
          className={mergeClass('urp-md__task-check', className)}
          checked={Boolean(checked)}
          readOnly
          tabIndex={-1}
          aria-readonly
          {...props}
        />
      );
    }
    return <input type={type} className={className} {...props} />;
  },
};
