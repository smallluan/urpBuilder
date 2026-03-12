import React from 'react';
import type { LucideProps } from 'lucide-react';
import { DynamicIcon, iconNames } from 'lucide-react/dynamic';
import type { IconName } from 'lucide-react/dynamic';

export type IconQuickFilterKey = 'all' | 'common' | 'direction' | 'action' | 'editor' | 'media' | 'status';
export type IconInitialFilterKey = 'all'
  | 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm'
  | 'n' | 'o' | 'p' | 'q' | 'r' | 's' | 't' | 'u' | 'v' | 'w' | 'x' | 'y' | 'z';

export const ICON_QUICK_FILTER_OPTIONS: Array<{ label: string; value: IconQuickFilterKey }> = [
  { label: '全部图标', value: 'all' },
  { label: '常用组件', value: 'common' },
  { label: '方向指引', value: 'direction' },
  { label: '操作交互', value: 'action' },
  { label: '编辑文档', value: 'editor' },
  { label: '媒体设备', value: 'media' },
  { label: '状态提醒', value: 'status' },
];

const ICON_INITIAL_LIST = 'abcdefghijklmnopqrstuvwxyz'.split('') as Array<Exclude<IconInitialFilterKey, 'all'>>;

export const ICON_INITIAL_FILTER_OPTIONS: Array<{ label: string; value: IconInitialFilterKey }> = [
  { label: '首字母：全部', value: 'all' },
  ...ICON_INITIAL_LIST.map((letter) => ({
    label: `首字母：${letter.toUpperCase()}`,
    value: letter,
  })),
];

const ICON_NAME_SET = new Set(iconNames as string[]);

const normalizeLegacyIconName = (iconName: string): string => {
  return iconName
    .replace(/([a-z\d])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();
};

export const ICON_NAME_OPTIONS = [...iconNames]
  .sort((first, second) => first.localeCompare(second))
  .map((name) => ({
    label: name,
    value: name,
  }));

const COMMON_ICON_NAMES: IconName[] = [
  'plus',
  'minus',
  'search',
  'settings',
  'check',
  'x',
  'info',
  'alert-triangle',
  'bell',
  'calendar',
  'clock',
  'user',
  'users',
  'star',
  'heart',
  'home',
  'link',
  'external-link',
  'download',
  'upload',
  'trash-2',
  'edit',
  'copy',
  'menu',
  'more-horizontal',
  'chevron-right',
  'chevron-left',
  'arrow-right',
  'arrow-left',
  'refresh-cw',
];

const QUICK_FILTER_KEYWORDS: Record<Exclude<IconQuickFilterKey, 'all' | 'common'>, string[]> = {
  direction: ['arrow', 'chevron', 'move', 'navigation', 'compass', 'corner', 'route'],
  action: ['plus', 'minus', 'trash', 'delete', 'download', 'upload', 'share', 'copy', 'save', 'send', 'refresh', 'play', 'pause', 'stop'],
  editor: ['edit', 'pen', 'pencil', 'text', 'type', 'align', 'bold', 'italic', 'underline', 'list', 'table', 'code', 'file', 'clipboard'],
  media: ['image', 'video', 'camera', 'mic', 'music', 'volume', 'headphone', 'tv', 'monitor', 'phone', 'tablet', 'speaker', 'radio'],
  status: ['check', 'x', 'alert', 'info', 'help', 'shield', 'lock', 'unlock', 'badge', 'flag', 'bell', 'circle-check', 'triangle-alert'],
};

const matchesQuickFilter = (name: string, filterKey: IconQuickFilterKey): boolean => {
  if (filterKey === 'all') {
    return true;
  }

  if (filterKey === 'common') {
    return COMMON_ICON_NAMES.includes(name as IconName);
  }

  const keywords = QUICK_FILTER_KEYWORDS[filterKey];
  return keywords.some((keyword) => name.includes(keyword));
};

export const getIconOptionsByQuickFilter = (filterKey: IconQuickFilterKey) => {
  return ICON_NAME_OPTIONS.filter((option) => matchesQuickFilter(option.value, filterKey));
};

const matchesInitialFilter = (name: string, initialFilter: IconInitialFilterKey): boolean => {
  if (initialFilter === 'all') {
    return true;
  }

  return name.startsWith(initialFilter);
};

export const getIconOptionsByFilters = (
  quickFilter: IconQuickFilterKey,
  initialFilter: IconInitialFilterKey,
) => {
  return ICON_NAME_OPTIONS.filter((option) => {
    return matchesQuickFilter(option.value, quickFilter) && matchesInitialFilter(option.value, initialFilter);
  });
};

export const resolveIconName = (iconName?: unknown): IconName | null => {
  if (typeof iconName !== 'string') {
    return null;
  }

  const normalizedName = iconName.trim();
  if (!normalizedName) {
    return null;
  }

  if (ICON_NAME_SET.has(normalizedName)) {
    return normalizedName as IconName;
  }

  const legacyNormalizedName = normalizeLegacyIconName(normalizedName);
  if (ICON_NAME_SET.has(legacyNormalizedName)) {
    return legacyNormalizedName as IconName;
  }

  return null;
};

export const renderNamedIcon = (
  iconName?: unknown,
  props?: Partial<LucideProps>,
): React.ReactNode => {
  const resolvedName = resolveIconName(iconName);
  if (!resolvedName) {
    return null;
  }

  return React.createElement(DynamicIcon as unknown as React.ComponentType<Record<string, unknown>>, {
    name: resolvedName,
    size: 16,
    strokeWidth: 2,
    ...props,
  });
};
