/**
 * 文档正文：优先加载 MDX（可内嵌 React），无文件时用 Markdown 占位稿。
 */

import type { ComponentType } from 'react';

const mdxModules = import.meta.glob<{ default: ComponentType }>('./content/**/*.mdx', {
  eager: true,
}) as Record<string, { default: ComponentType }>;

function docKey(sectionId: string, slug: string): string {
  return `./content/${sectionId}/${slug}.mdx`;
}

export function getDocMdxComponent(sectionId: string, slug: string): ComponentType | null {
  const mod = mdxModules[docKey(sectionId, slug)];
  return mod?.default ?? null;
}

/** 无对应 .mdx 时的占位 Markdown（走 DocsMarkdown） */
export function getDocMarkdownFallback(sectionId: string, slug: string, pageTitle: string): string {
  return [
    '> **本文档编写中**，稍后补充。',
    '',
    `页面标题：**${pageTitle}**。可在 \`urpBuilder/src/pages/Docs/content/${sectionId}/${slug}.mdx\` 新增 MDX 正文（支持内嵌 React）。`,
    '',
  ].join('\n');
}
