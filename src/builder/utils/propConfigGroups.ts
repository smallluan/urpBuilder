/**
 * 属性配置面板分组：优先读 schema.group，否则按 propKey 推断。
 */

export const PROP_SECTION_ORDER = [
  '标识与名称',
  '受控与默认值',
  '状态与交互',
  '内容与文案',
  '外观与展示',
  '布局与尺寸',
  '数据与媒体',
  '其他',
] as const;

export type PropSectionLabel = (typeof PROP_SECTION_ORDER)[number] | string;

export interface PropSchemaLike {
  name?: string;
  value?: unknown;
  group?: string;
  editType?: string;
  editInput?: string;
}

export function getPropSection(propKey: string, schema: PropSchemaLike, nodeType?: string): PropSectionLabel {
  const explicit = typeof schema.group === 'string' ? schema.group.trim() : '';
  if (explicit) {
    return explicit;
  }

  if (propKey === 'controlled' || propKey === 'value' || propKey === 'defaultValue') {
    return '受控与默认值';
  }

  if (
    ['visible', 'disabled', 'readonly', 'readOnly', 'clearable', 'loading', 'borderless', 'autofocus', 'autoFocus'].includes(
      propKey,
    )
  ) {
    return '状态与交互';
  }

  if (
    ['content', 'placeholder', 'label', 'title', 'help', 'tips', 'description', 'name', 'href', 'target'].includes(propKey)
    || propKey.endsWith('Text')
    || propKey.endsWith('Label')
  ) {
    return '内容与文案';
  }

  if (
    [
      'size',
      'status',
      'theme',
      'variant',
      'shape',
      'appearance',
      'type',
      'level',
      'align',
      'justify',
      'direction',
      'placement',
      'scrollPosition',
      'objectFit',
      'fit',
      'lazy',
    ].includes(propKey)
    || propKey.startsWith('font')
    || propKey.includes('Color')
    || (nodeType === 'Progress' && (propKey === 'color' || propKey === 'trackColor'))
  ) {
    return '外观与展示';
  }

  if (
    ['span', 'offset', 'gutter', 'flex', 'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight', 'breakLine'].includes(
      propKey,
    )
    || propKey.startsWith('grid')
  ) {
    return '布局与尺寸';
  }

  if (
    ['images', 'options', 'list', 'data', 'fields', 'columns', 'rows', 'max', 'min', 'step', 'format'].includes(propKey)
    || propKey.includes('Image')
    || propKey.includes('Icon')
  ) {
    return '数据与媒体';
  }

  return '其他';
}

export function sortSectionKeys(sections: string[]): string[] {
  return [...sections].sort((a, b) => {
    const ia = PROP_SECTION_ORDER.indexOf(a as (typeof PROP_SECTION_ORDER)[number]);
    const ib = PROP_SECTION_ORDER.indexOf(b as (typeof PROP_SECTION_ORDER)[number]);
    if (ia === -1 && ib === -1) {
      return a.localeCompare(b, 'zh-CN');
    }
    if (ia === -1) {
      return 1;
    }
    if (ib === -1) {
      return -1;
    }
    return ia - ib;
  });
}
