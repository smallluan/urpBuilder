/**
 * 生成可在 `document.querySelector('#…')` 中使用的 id。
 * 纯数字或数字开头的片段（如 `1-页面搭建`）不是合法 CSS ID 选择器，会导致 TDesign Anchor 报错。
 */
export function assignHeadingIds(
  headingElements: HTMLHeadingElement[],
  idCount: Map<string, number>,
): void {
  let fallbackIndex = 0;
  headingElements.forEach((heading) => {
    const text = heading.textContent?.trim() || '';
    if (!text) {
      return;
    }
    fallbackIndex += 1;
    const normalized = text
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\u4e00-\u9fa5-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    const slug = normalized || `heading-${fallbackIndex}`;
    const seen = idCount.get(slug) ?? 0;
    idCount.set(slug, seen + 1);
    const suffix = seen === 0 ? '' : `-${seen + 1}`;
    heading.id = `doc-${slug}${suffix}`;
  });
}
