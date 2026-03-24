import { v4 as uuidv4 } from 'uuid';
import type { UiTreeNode } from '../builder/store/types';
import { createSlotNode } from '../builder/utils/slot';
import { getTabsPanelSlotKey, normalizeTabsList } from '../builder/utils/tabs';

const createTypographyTitleNode = (): UiTreeNode => ({
  key: uuidv4(),
  label: '标题文本',
  type: 'Typography.Title',
  props: {
    content: {
      name: '文本内容',
      value: '卡片标题',
      editType: 'input',
    },
    level: {
      name: '标题级别',
      value: 'h5',
      editType: 'select',
      payload: {
        options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
      },
    },
  },
  lifetimes: [],
  children: [],
});

const createTypographyParagraphNode = (): UiTreeNode => ({
  key: uuidv4(),
  label: '段落文本',
  type: 'Typography.Paragraph',
  props: {
    content: {
      name: '文本内容',
      value: '这是一段可编辑的段落文本。',
      editType: 'input',
    },
  },
  lifetimes: [],
  children: [],
});

const createListItemTemplateNode = (): UiTreeNode => ({
  key: uuidv4(),
  label: '列表项（抽象）',
  type: 'List.Item',
  props: {
    showImage: {
      name: '显示图片',
      value: true,
      editType: 'switch',
    },
    showDescription: {
      name: '显示描述',
      value: true,
      editType: 'switch',
    },
    showAction: {
      name: '显示操作按钮',
      value: true,
      editType: 'switch',
    },
    actionTheme: {
      name: '按钮主题',
      value: 'default',
      editType: 'select',
      payload: {
        options: ['default', 'primary', 'danger', 'warning', 'success'],
      },
    },
    actionVariant: {
      name: '按钮风格',
      value: 'text',
      editType: 'select',
      payload: {
        options: ['base', 'outline', 'dashed', 'text'],
      },
    },
    actionSize: {
      name: '按钮尺寸',
      value: 'small',
      editType: 'select',
      payload: {
        options: ['small', 'medium', 'large'],
      },
    },
  },
  lifetimes: [],
  children: [],
});

const createStepsItemNode = (index: number): UiTreeNode => ({
  key: uuidv4(),
  label: '步骤项',
  type: 'Steps.Item',
  props: {
    title: {
      name: '标题',
      value: `步骤${index + 1}`,
      editType: 'input',
    },
    content: {
      name: '描述',
      value: `这是步骤${index + 1}的说明`,
      editType: 'input',
    },
    status: {
      name: '状态',
      value: 'default',
      editType: 'select',
      payload: {
        options: ['default', 'process', 'finish', 'error'],
      },
    },
    value: {
      name: '标识(value)',
      value: '',
      editType: 'input',
    },
  },
  lifetimes: [],
  children: [],
});

const createHeadMenuItemNode = (label: string, value: string): UiTreeNode => ({
  key: uuidv4(),
  label: '菜单项',
  type: 'Menu.Item',
  props: {
    content: {
      name: '内容',
      value: label,
      editType: 'input',
    },
    value: {
      name: '标识(value)',
      value,
      editType: 'input',
    },
    iconName: {
      name: '图标',
      value: '',
      editType: 'iconSelect',
    },
    href: {
      name: '跳转地址',
      value: '',
      editType: 'input',
    },
    target: {
      name: '打开方式',
      value: '_self',
      editType: 'select',
      payload: {
        options: ['_self', '_blank', '_parent', '_top'],
      },
    },
    disabled: {
      name: '禁用',
      value: false,
      editType: 'switch',
    },
  },
  lifetimes: ['onClick'],
  children: [],
});

const createHeadSubMenuNode = (): UiTreeNode => ({
  key: uuidv4(),
  label: '子菜单',
  type: 'Menu.Submenu',
  props: {
    title: {
      name: '标题',
      value: '更多',
      editType: 'input',
    },
    content: {
      name: '内容',
      value: '',
      editType: 'input',
    },
    value: {
      name: '标识(value)',
      value: 'more',
      editType: 'input',
    },
    iconName: {
      name: '图标',
      value: '',
      editType: 'iconSelect',
    },
    disabled: {
      name: '禁用',
      value: false,
      editType: 'switch',
    },
  },
  lifetimes: [],
  children: [
    createHeadMenuItemNode('帮助中心', 'help'),
    createHeadMenuItemNode('关于我们', 'about'),
  ],
});

const createDefaultMenuChildren = (): UiTreeNode[] => {
  return [
    createHeadMenuItemNode('首页', 'home'),
    createHeadMenuItemNode('文档', 'docs'),
    createHeadSubMenuNode(),
  ];
};

const normalizeCollapseSeedList = (value: unknown): Array<{ value: string; label: string }> => {
  const source = Array.isArray(value) ? value : [];
  const usedValues = new Set<string>();
  const normalized = source
    .filter((item) => item && typeof item === 'object')
    .map((item, index) => {
      const record = item as Record<string, unknown>;
      const rawValue = typeof record.value === 'string' ? record.value.trim() : String(record.value ?? '').trim();
      let nextValue = rawValue || `collapse-${index + 1}`;
      if (usedValues.has(nextValue)) {
        nextValue = `${nextValue}-${index + 1}`;
      }
      usedValues.add(nextValue);
      const rawLabel = typeof record.label === 'string' ? record.label.trim() : '';
      return {
        value: nextValue,
        label: rawLabel || `面板 ${index + 1}`,
      };
    });

  if (normalized.length > 0) {
    return normalized;
  }

  return [
    { value: 'collapse-1', label: '面板 1' },
    { value: 'collapse-2', label: '面板 2' },
  ];
};

const buildInitialChildren = (type: string, props?: Record<string, unknown>): UiTreeNode[] => {
  if (type === 'Card') {
    return [
      createSlotNode('header', '头部插槽', [createTypographyTitleNode()]),
      createSlotNode('body', '内容插槽', [createTypographyParagraphNode()]),
    ];
  }

  if (type === 'List') {
    return [createListItemTemplateNode()];
  }

  if (type === 'Steps') {
    return [createStepsItemNode(0), createStepsItemNode(1), createStepsItemNode(2)];
  }

  if (type === 'Tabs') {
    const listSchema = (props?.list ?? null) as { value?: unknown } | null;
    const tabsList = normalizeTabsList(listSchema?.value);
    return tabsList.map((item) => createSlotNode(getTabsPanelSlotKey(item.value), `${item.label} 面板`));
  }

  if (type === 'Collapse') {
    const listSchema = (props?.list ?? null) as { value?: unknown } | null;
    const collapseList = normalizeCollapseSeedList(listSchema?.value);
    return collapseList.flatMap((item) => ([
      createSlotNode(`collapse:header:${item.value}`, `${item.label} 头部`, [createTypographyTitleNode()]),
      createSlotNode(`collapse:panel:${item.value}`, `${item.label} 内容`, [createTypographyParagraphNode()]),
    ]));
  }

  if (type === 'HeadMenu') {
    return createDefaultMenuChildren();
  }

  if (type === 'Menu') {
    return createDefaultMenuChildren();
  }

  if (type === 'CustomComponent') {
    const rawSlots = (props?.__slots as { value?: unknown } | undefined)?.value ?? props?.__slots;
    const slotItems = (() => {
      if (Array.isArray(rawSlots)) {
        return rawSlots;
      }

      if (typeof rawSlots === 'string') {
        const text = rawSlots.trim();
        if (!text) {
          return [] as unknown[];
        }

        try {
          const parsed = JSON.parse(text);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [] as unknown[];
        }
      }

      return [] as unknown[];
    })();
    const normalized = slotItems
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return null;
        }

        const record = item as Record<string, unknown>;
        const key = String(record.key ?? '').trim();
        const label = String(record.label ?? '').trim();
        if (!key) {
          return null;
        }

        return {
          key,
          label: label || `插槽：${key}`,
        };
      })
      .filter((item): item is { key: string; label: string } => !!item);

    if (normalized.length === 0) {
      return [];
    }

    return normalized.map((item) => createSlotNode(item.key, item.label));
  }

  return [];
};

export const toUiTreeNode = (componentData: Record<string, unknown>): UiTreeNode => {
  const name = typeof componentData.name === 'string' ? componentData.name : '';
  const type = typeof componentData.type === 'string' ? componentData.type : '';
  const props =
    componentData.props && typeof componentData.props === 'object'
      ? (componentData.props as Record<string, unknown>)
      : {};
  const lifetimes = Array.isArray(componentData.lifetimes)
    ? componentData.lifetimes.filter((item): item is string => typeof item === 'string')
    : [];

  return {
    key: uuidv4(),
    label: name || type || '未命名组件',
    type,
    props,
    lifetimes,
    children: buildInitialChildren(type, props),
  };
};

export const appendNodeByParentKey = (
  node: UiTreeNode,
  parentKey: string,
  newNode: UiTreeNode,
): UiTreeNode => {
  if (node.key === parentKey) {
    return {
      ...node,
      children: [...(node.children ?? []), newNode],
    };
  }

  if (!node.children?.length) {
    return node;
  }

  let changed = false;
  const nextChildren = node.children.map((child) => {
    const next = appendNodeByParentKey(child, parentKey, newNode);
    if (next !== child) {
      changed = true;
    }
    return next;
  });

  return changed ? { ...node, children: nextChildren } : node;
};

export const findNodeByKey = (node: UiTreeNode, targetKey: string): UiTreeNode | null => {
  if (node.key === targetKey) {
    return node;
  }

  if (!node.children?.length) {
    return null;
  }

  for (const child of node.children) {
    const found = findNodeByKey(child, targetKey);
    if (found) {
      return found;
    }
  }

  return null;
};

export const updateNodeByKey = (
  node: UiTreeNode,
  targetKey: string,
  updater: (target: UiTreeNode) => UiTreeNode,
): UiTreeNode => {
  if (node.key === targetKey) {
    return updater(node);
  }

  if (!node.children?.length) {
    return node;
  }

  let changed = false;
  const nextChildren = node.children.map((child) => {
    const next = updateNodeByKey(child, targetKey, updater);
    if (next !== child) {
      changed = true;
    }
    return next;
  });

  return changed ? { ...node, children: nextChildren } : node;
};

export interface RemoveNodeResult {
  tree: UiTreeNode;
  removedNode: UiTreeNode | null;
  parentKey: string | null;
  index: number;
}

export const removeNodeByKey = (root: UiTreeNode, targetKey: string): RemoveNodeResult => {
  if (root.key === targetKey) {
    return {
      tree: root,
      removedNode: null,
      parentKey: null,
      index: -1,
    };
  }

  const walk = (node: UiTreeNode): RemoveNodeResult => {
    if (!node.children?.length) {
      return {
        tree: node,
        removedNode: null,
        parentKey: null,
        index: -1,
      };
    }

    const hitIndex = node.children.findIndex((child) => child.key === targetKey);
    if (hitIndex > -1) {
      const removedNode = node.children[hitIndex];
      const nextChildren = [...node.children.slice(0, hitIndex), ...node.children.slice(hitIndex + 1)];
      return {
        tree: { ...node, children: nextChildren },
        removedNode,
        parentKey: node.key,
        index: hitIndex,
      };
    }

    let hasChanged = false;
    let removedNode: UiTreeNode | null = null;
    let parentKey: string | null = null;
    let index = -1;

    const nextChildren = node.children.map((child) => {
      const result = walk(child);
      if (result.tree !== child) {
        hasChanged = true;
      }
      if (result.removedNode && !removedNode) {
        removedNode = result.removedNode;
        parentKey = result.parentKey;
        index = result.index;
      }
      return result.tree;
    });

    return {
      tree: hasChanged ? { ...node, children: nextChildren } : node,
      removedNode,
      parentKey,
      index,
    };
  };

  return walk(root);
};

export const insertNodeAtParentIndex = (
  node: UiTreeNode,
  parentKey: string,
  index: number,
  insertedNode: UiTreeNode,
): UiTreeNode => {
  if (node.key === parentKey) {
    const children = node.children ?? [];
    const safeIndex = Math.max(0, Math.min(index, children.length));
    const nextChildren = [
      ...children.slice(0, safeIndex),
      insertedNode,
      ...children.slice(safeIndex),
    ];

    return {
      ...node,
      children: nextChildren,
    };
  }

  if (!node.children?.length) {
    return node;
  }

  let changed = false;
  const nextChildren = node.children.map((child) => {
    const next = insertNodeAtParentIndex(child, parentKey, index, insertedNode);
    if (next !== child) {
      changed = true;
    }
    return next;
  });

  return changed ? { ...node, children: nextChildren } : node;
};
