/**
 * 文档正文：优先加载 MDX（可内嵌 React），无文件时用 Markdown 占位稿。
 *
 * 更新时间：在对应 `.mdx` 顶层增加
 * `export const updatedAt = '2026-04-14';`（建议 ISO 日期），构建时会随模块导出。
 */

import type { ComponentType } from 'react';

export type DocMdxModule = {
  default: ComponentType;
  updatedAt?: string;
};

const mdxModules = import.meta.glob<DocMdxModule>('./content/**/*.mdx', {
  eager: true,
}) as Record<string, DocMdxModule>;

function docKey(sectionId: string, slug: string): string {
  return `./content/${sectionId}/${slug}.mdx`;
}

export function getDocMdxComponent(sectionId: string, slug: string): ComponentType | null {
  const mod = mdxModules[docKey(sectionId, slug)];
  return mod?.default ?? null;
}

/** 读取 MDX 模块导出的元信息（如 updatedAt） */
export function getDocMdxMeta(sectionId: string, slug: string): Pick<DocMdxModule, 'updatedAt'> {
  const mod = mdxModules[docKey(sectionId, slug)];
  if (!mod) {
    return {};
  }
  const { updatedAt } = mod;
  return typeof updatedAt === 'string' && updatedAt.trim() !== '' ? { updatedAt: updatedAt.trim() } : {};
}

/** 将 MDX 中的 updatedAt（多为 YYYY-MM-DD）格式化为中文日期展示 */
export function formatDocUpdatedAt(raw: string): string {
  const t = Date.parse(raw);
  if (!Number.isNaN(t)) {
    return new Date(t).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  return raw;
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
