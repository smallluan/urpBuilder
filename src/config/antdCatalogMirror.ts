/**
 * Ant Design 物料与 TDesign 物料 schema 对齐：同名、同 props、同 lifetimes（仅 type 为 antd.*）。
 */

export type CatalogComponentDef = {
  type: string;
  name: string;
  props: Record<string, unknown>;
  lifetimes?: string[];
};

type MirrorPair = {
  antdType: string;
  tdesignType: string;
  /** 覆盖展示名（如对话框与抽屉共用 Drawer schema） */
  name?: string;
};

/** 与 {@link buildMirroredAntdCatalogEntries} 使用同一数据源，供预览/搭建分发层做类型映射 */
export const ANTD_TD_MIRROR_PAIRS: readonly MirrorPair[] = [
  { antdType: 'antd.Divider', tdesignType: 'Divider' },
  { antdType: 'antd.Typography.Title', tdesignType: 'Typography.Title' },
  { antdType: 'antd.Typography.Paragraph', tdesignType: 'Typography.Paragraph' },
  { antdType: 'antd.Typography.Text', tdesignType: 'Typography.Text' },
  { antdType: 'antd.Typography.Link', tdesignType: 'Link' },
  { antdType: 'antd.Button', tdesignType: 'Button' },
  { antdType: 'antd.Icon', tdesignType: 'Icon' },
  { antdType: 'antd.Card', tdesignType: 'Card' },
  { antdType: 'antd.Statistic', tdesignType: 'Statistic' },
  { antdType: 'antd.Input', tdesignType: 'Input' },
  { antdType: 'antd.Textarea', tdesignType: 'Textarea' },
  { antdType: 'antd.InputNumber', tdesignType: 'InputNumber' },
  { antdType: 'antd.Switch', tdesignType: 'Switch' },
  { antdType: 'antd.Space', tdesignType: 'Space' },
  { antdType: 'antd.Row', tdesignType: 'Grid.Row' },
  { antdType: 'antd.Col', tdesignType: 'Grid.Col' },
  { antdType: 'antd.Layout', tdesignType: 'Layout' },
  { antdType: 'antd.Layout.Header', tdesignType: 'Layout.Header' },
  { antdType: 'antd.Layout.Content', tdesignType: 'Layout.Content' },
  { antdType: 'antd.Layout.Footer', tdesignType: 'Layout.Footer' },
  { antdType: 'antd.Layout.Sider', tdesignType: 'Layout.Aside' },
  { antdType: 'antd.Table', tdesignType: 'Table' },
  { antdType: 'antd.List', tdesignType: 'List' },
  { antdType: 'antd.Drawer', tdesignType: 'Drawer' },
  { antdType: 'antd.Modal', tdesignType: 'Drawer', name: '对话框' },
  { antdType: 'antd.Menu', tdesignType: 'Menu' },
  { antdType: 'antd.Menu.Item', tdesignType: 'Menu.Item' },
  { antdType: 'antd.Menu.SubMenu', tdesignType: 'Menu.Submenu' },
  { antdType: 'antd.BackTop', tdesignType: 'BackTop' },
  { antdType: 'antd.Progress', tdesignType: 'Progress' },
  { antdType: 'antd.Image', tdesignType: 'Image' },
  { antdType: 'antd.Avatar', tdesignType: 'Avatar' },
  { antdType: 'antd.ColorPicker', tdesignType: 'ColorPicker' },
  { antdType: 'antd.TimePicker', tdesignType: 'TimePicker' },
  { antdType: 'antd.TimeRangePicker', tdesignType: 'TimeRangePicker' },
  { antdType: 'antd.Slider', tdesignType: 'Slider' },
  { antdType: 'antd.Upload', tdesignType: 'Upload' },
  { antdType: 'antd.Popover', tdesignType: 'Popup' },
  { antdType: 'antd.Calendar', tdesignType: 'Calendar' },
  { antdType: 'antd.Tabs', tdesignType: 'Tabs' },
  { antdType: 'antd.Collapse', tdesignType: 'Collapse' },
  { antdType: 'antd.Carousel', tdesignType: 'Swiper' },
];

function deepCloneCatalogItem<T>(item: T): T {
  return JSON.parse(JSON.stringify(item)) as T;
}

export function buildMirroredAntdCatalogEntries(tdesignCatalog: readonly CatalogComponentDef[]): CatalogComponentDef[] {
  const byType = new Map(tdesignCatalog.map((c) => [c.type, c]));
  const out: CatalogComponentDef[] = [];

  for (const { antdType, tdesignType, name } of ANTD_TD_MIRROR_PAIRS) {
    const src = byType.get(tdesignType);
    if (!src) {
      continue;
    }
    const next = deepCloneCatalogItem(src);
    next.type = antdType;
    if (name) {
      next.name = name;
    }
    out.push(next);
  }

  return out;
}
