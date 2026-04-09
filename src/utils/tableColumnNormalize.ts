/** TDesign 搭建器表格列配置 -> 通用列对象（colKey/title/...） */
export const normalizeBuilderTableColumns = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [] as Array<Record<string, unknown>>;
  }

  return value
    .filter((item) => !!item && typeof item === 'object')
    .map((item) => item as Record<string, unknown>)
    .map((item, index) => {
      const colKey = String(item.colKey ?? '').trim();
      if (!colKey) {
        return null;
      }

      const title = String(item.title ?? '').trim() || `列${index + 1}`;
      const widthRaw = item.width;
      const width = typeof widthRaw === 'number' && Number.isFinite(widthRaw) ? Math.round(widthRaw) : undefined;
      const align = item.align === 'center' || item.align === 'right' ? item.align : 'left';
      const ellipsis = typeof item.ellipsis === 'boolean' ? item.ellipsis : true;
      const sortType = item.sortType === 'all' || item.sortType === 'asc' || item.sortType === 'desc' ? item.sortType : undefined;
      const fixed = item.fixed === 'left' || item.fixed === 'right' ? item.fixed : undefined;

      const column: Record<string, unknown> = {
        colKey,
        title,
        align,
        ellipsis,
      };

      if (typeof width === 'number' && width > 0) {
        column.width = width;
      }
      if (sortType) {
        column.sortType = sortType;
      }
      if (fixed) {
        column.fixed = fixed;
      }

      return column;
    })
    .filter((item): item is Record<string, unknown> => !!item);
};
