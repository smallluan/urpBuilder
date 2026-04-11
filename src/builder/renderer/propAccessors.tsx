import React from 'react';
import type { UiTreeNode } from '../store/types';
import type { ListRecord, SwiperImageItem } from '../../types/component';
import { normalizeTabsList, normalizeTabsValue } from '../utils/tabs';
import { renderNamedIcon } from '../../constants/iconRegistry';
import { resolveSimulatorStyle } from '../utils/simulatorStyle';
import { parseProgressColorValue } from '../utils/progressAntdBridge';
import { parseDslAutosizeValue } from '../../utils/antdTdesignPropBridge';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function createPropAccessors(data: UiTreeNode | undefined) {
  const getProp = (propName: string) => {
    const prop = data?.props?.[propName] as { value?: unknown } | undefined;
    return prop?.value;
  };

  const getNumberProp = (propName: string) => {
    const value = getProp(propName);
    return typeof value === 'number' ? value : undefined;
  };

  const getStringProp = (propName: string) => {
    const value = getProp(propName);
    return typeof value === 'string' ? value : undefined;
  };

  const getBooleanProp = (propName: string) => {
    const value = getProp(propName);
    return typeof value === 'boolean' ? value : undefined;
  };

  const getCalendarValueProp = (propName: string) => {
    const value = getProp(propName);
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed ? trimmed : undefined;
    }
    if (value instanceof Date) return value;
    return undefined;
  };

  const getStyleProp = () => {
    const value = getProp('__style');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    return resolveSimulatorStyle(value as React.CSSProperties, { mapFixedToAbsolute: true });
  };

  const inlineStyle = getStyleProp();

  const mergeStyle = (baseStyle?: React.CSSProperties): React.CSSProperties | undefined => {
    if (!baseStyle && !inlineStyle) return undefined;
    return { ...(baseStyle ?? {}), ...(inlineStyle ?? {}) };
  };

  const getStringArrayProp = (propName: string) => {
    const value = getProp(propName);
    if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
    if (typeof value === 'string') {
      return value.split(/\r?\n|,|，/).map((item) => item.trim()).filter(Boolean);
    }
    return [];
  };

  const getFiniteNumberProp = (propName: string) => {
    const value = getProp(propName);
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  };

  const getInputNumberValueProp = (propName: string) => {
    const value = getProp(propName);
    if (typeof value === 'number') return Number.isNaN(value) ? undefined : value;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed === '' ? undefined : trimmed;
    }
    return undefined;
  };

  const getSliderValueProp = (propName: string): number | [number, number] | undefined => {
    const value = getProp(propName);
    const parseNumber = (input: unknown) => {
      if (typeof input === 'number' && Number.isFinite(input)) return input;
      if (typeof input === 'string' && input.trim()) {
        const parsed = Number(input);
        return Number.isFinite(parsed) ? parsed : undefined;
      }
      return undefined;
    };
    const parseArrayValue = (list: unknown[]) => {
      const numbers = list.map((item) => parseNumber(item)).filter((item): item is number => typeof item === 'number');
      if (numbers.length >= 2) return [numbers[0], numbers[1]] as [number, number];
      if (numbers.length === 1) return [numbers[0], numbers[0]] as [number, number];
      return undefined;
    };
    if (Array.isArray(value)) return parseArrayValue(value);
    const numberValue = parseNumber(value);
    if (typeof numberValue === 'number') return numberValue;
    if (typeof value === 'string') {
      const text = value.trim();
      if (!text) return undefined;
      if (text.startsWith('[') && text.endsWith(']')) {
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) return parseArrayValue(parsed);
        } catch { return undefined; }
      }
      const chunks = text.split(/,|，|\s+/).map((item) => item.trim()).filter(Boolean);
      if (chunks.length >= 2) return parseArrayValue(chunks);
    }
    return undefined;
  };

  const getStepsCurrentProp = (propName: string): string | number | undefined => {
    const value = getProp(propName);
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const text = value.trim();
      if (!text) return undefined;
      const parsed = Number(text);
      return Number.isFinite(parsed) ? parsed : text;
    }
    return undefined;
  };

  const getTimeStepsProp = () => {
    const value = getProp('steps');
    const toValidStep = (input: unknown) => {
      const parsed = Number(input);
      if (!Number.isFinite(parsed) || parsed <= 0) return 1;
      return Math.max(1, Math.round(parsed));
    };
    if (Array.isArray(value)) {
      const list = value.slice(0, 3).map((item) => toValidStep(item));
      if (list.length === 3) return list;
      return [1, 1, 1];
    }
    if (typeof value === 'string') {
      const list = value.split(/,|，|\s+/).map((item) => item.trim()).filter(Boolean).slice(0, 3).map((item) => toValidStep(item));
      if (list.length === 3) return list;
    }
    return [1, 1, 1];
  };

  const getTimeRangeValueProp = (propName: string) => {
    const values = getStringArrayProp(propName).slice(0, 2);
    return values.length === 2 ? values : undefined;
  };

  const getTabsListProp = () => normalizeTabsList(getProp('list'));
  const getTabsControlledValue = () => normalizeTabsValue(getProp('value'));
  const getTabsDefaultValue = () => normalizeTabsValue(getProp('defaultValue'));

  const getMenuValueProp = (propName: string): string | number | undefined => {
    const value = getProp(propName);
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const text = value.trim();
      if (!text) return undefined;
      const parsed = Number(text);
      return Number.isFinite(parsed) ? parsed : text;
    }
    return undefined;
  };

  const getMenuValueArrayProp = (propName: string): Array<string | number> | undefined => {
    const value = getProp(propName);
    if (Array.isArray(value)) {
      const normalized = value
        .map((item) => {
          if (typeof item === 'number' && Number.isFinite(item)) return item;
          if (typeof item === 'string') {
            const text = item.trim();
            if (!text) return undefined;
            const parsed = Number(text);
            return Number.isFinite(parsed) ? parsed : text;
          }
          return undefined;
        })
        .filter((item): item is string | number => typeof item !== 'undefined');
      return normalized.length ? normalized : undefined;
    }
    if (typeof value === 'string') {
      const normalized = value
        .split(/\r?\n|,|，/)
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => {
          const parsed = Number(item);
          return Number.isFinite(parsed) ? parsed : item;
        });
      return normalized.length ? normalized : undefined;
    }
    return undefined;
  };

  const getMenuWidthProp = (propName: string): string | number | Array<string | number> | undefined => {
    const value = getProp(propName);
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (Array.isArray(value)) {
      const normalized = value
        .map((item) => {
          if (typeof item === 'number' && Number.isFinite(item)) return item;
          if (typeof item === 'string') { const text = item.trim(); return text || undefined; }
          return undefined;
        })
        .filter((item): item is string | number => typeof item !== 'undefined');
      return normalized.length ? normalized : undefined;
    }
    if (typeof value === 'string') {
      const text = value.trim();
      if (!text) return undefined;
      const chunks = text.split(/,|，/).map((item) => item.trim()).filter(Boolean);
      if (chunks.length >= 2) return chunks.slice(0, 2);
      const parsed = Number(text);
      return Number.isFinite(parsed) ? parsed : text;
    }
    return undefined;
  };

  const getBackTopOffsetProp = (propName: string): [string | number, string | number] | undefined => {
    const value = getProp(propName);
    if (Array.isArray(value) && value.length >= 2) return [value[0] as string | number, value[1] as string | number];
    if (typeof value === 'string') {
      const chunks = value.split(/,|，/).map((item) => item.trim()).filter(Boolean);
      if (chunks.length >= 2) return [chunks[0], chunks[1]];
    }
    return undefined;
  };

  const getBackTopVisibleHeightProp = (propName: string): string | number | undefined => {
    const value = getProp(propName);
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) return value.trim();
    return undefined;
  };

  const getBackTopTargetProp = (propName: string) => {
    const target = getStringProp(propName);
    return target || 'body';
  };

  const getBackTopContainerProp = () =>
    () => (document.querySelector('[data-builder-scroll-container="true"]') as HTMLElement | null) ?? document.body;

  const getBackTopContentNode = () => {
    const text = getStringProp('content');
    const iconNode = renderNamedIcon(getStringProp('iconName'), {
      size: getStringProp('size') === 'small' ? 16 : 20,
      strokeWidth: 2,
    });
    if (!iconNode) return text || undefined;
    return (
      <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{iconNode}</span>
        {text ? <span>{text}</span> : null}
      </span>
    );
  };

  const getBuilderDrawerAttach = () =>
    () => (document.querySelector('[data-builder-scroll-container="true"]') as HTMLElement | null) ?? document.body;

  const getDrawerHeaderProp = (): string | boolean => {
    const showHeader = getBooleanProp('showHeader') !== false;
    if (!showHeader) return false;
    const headerText = getStringProp('header')?.trim();
    return headerText || true;
  };

  const getDrawerFooterProp = (): boolean => getBooleanProp('footer') !== false;

  const getDrawerSizeDraggableProp = (): boolean | { min: number; max: number } | undefined => {
    const enabled = getBooleanProp('sizeDraggable') === true;
    if (!enabled) return undefined;
    const min = getNumberProp('sizeDragMin');
    const max = getNumberProp('sizeDragMax');
    if (typeof min === 'number' && typeof max === 'number' && min > 0 && max >= min) return { min, max };
    return true;
  };

  const getProgressColorProp = (propName: string): string | string[] | Record<string, string> | undefined =>
    parseProgressColorValue(getProp(propName));

  const getProgressLabelProp = (): string | boolean => {
    if (getBooleanProp('showLabel') === false) return false;
    const text = getStringProp('labelText')?.trim();
    return text || true;
  };

  const getProgressSizeProp = (propName: string): string | number | undefined => {
    const value = getProp(propName);
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const text = value.trim();
      if (!text) return undefined;
      const parsed = Number(text);
      return Number.isFinite(parsed) ? parsed : text;
    }
    return undefined;
  };

  const getProgressStatusProp = (): string | undefined => {
    const status = getStringProp('status')?.trim();
    if (!status || status === 'default') return undefined;
    return status;
  };

  const getUploadAbridgeNameProp = (propName: string): [number, number] | undefined => {
    const value = getProp(propName);
    const normalize = (input: unknown[]) => {
      const numbers = input.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item >= 0).map((item) => Math.round(item));
      if (numbers.length >= 2) return [numbers[0], numbers[1]] as [number, number];
      return undefined;
    };
    if (Array.isArray(value)) return normalize(value);
    if (typeof value === 'string') {
      const text = value.trim();
      if (!text) return undefined;
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) return normalize(parsed);
      } catch {
        return normalize(text.split(/,|，/).map((item) => item.trim()).filter(Boolean));
      }
    }
    return undefined;
  };

  const getUploadFileListProp = (propName: string): Array<Record<string, unknown>> | undefined => {
    const value = getProp(propName);
    if (Array.isArray(value)) return value.filter((item) => !!item && typeof item === 'object') as Array<Record<string, unknown>>;
    if (typeof value === 'string' && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.filter((item) => !!item && typeof item === 'object') as Array<Record<string, unknown>>;
      } catch { return undefined; }
    }
    return undefined;
  };

  const getUploadObjectProp = (propName: string): Record<string, unknown> | undefined => {
    const value = getProp(propName);
    if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
    if (typeof value === 'string' && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
      } catch { return undefined; }
    }
    return undefined;
  };

  const getUploadSizeLimitProp = (propName: string): number | Record<string, unknown> | undefined => {
    const value = getProp(propName);
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
    if (typeof value === 'string' && value.trim()) {
      const text = value.trim();
      const parsedNumber = Number(text);
      if (Number.isFinite(parsedNumber)) return parsedNumber;
      try {
        const parsed = JSON.parse(text);
        if (typeof parsed === 'number' && Number.isFinite(parsed)) return parsed;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
      } catch { return undefined; }
    }
    return undefined;
  };

  const getUploadStatusProp = (propName: string): string | undefined => {
    const value = getStringProp(propName)?.trim();
    if (!value || value === 'default') return undefined;
    return value;
  };

  const getTextareaStyleProp = (): React.CSSProperties | undefined => {
    const value = getProp('style');
    if (value && typeof value === 'object' && !Array.isArray(value)) return value as React.CSSProperties;
    if (typeof value === 'string') {
      const text = value.trim();
      if (!text) return undefined;
      try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as React.CSSProperties;
      } catch { return undefined; }
    }
    return undefined;
  };

  const getTextareaAutosizeProp = (): boolean | { minRows?: number; maxRows?: number } | undefined =>
    parseDslAutosizeValue(getProp('autosize'));

  const getSwiperImages = (): SwiperImageItem[] => {
    const value = getProp('images');
    if (Array.isArray(value)) {
      return value
        .filter((item) => !!item && typeof item === 'object')
        .map((item) => {
          const record = item as Partial<SwiperImageItem>;
          return {
            src: String(record.src ?? '').trim(),
            fallback: String(record.fallback ?? '').trim(),
            lazy: typeof record.lazy === 'boolean' ? record.lazy : true,
            objectFit: String(record.objectFit ?? 'cover'),
            objectPosition: String(record.objectPosition ?? 'center'),
          };
        })
        .filter((item) => !!item.src);
    }
    return getStringArrayProp('images').map((src) => ({
      src, fallback: '', lazy: true, objectFit: 'cover', objectPosition: 'center',
    }));
  };

  const getListFieldValue = (record: ListRecord, fieldPath?: string): string | undefined => {
    if (!fieldPath) return undefined;
    const path = fieldPath.trim();
    if (!path) return undefined;
    const value = path.split('.').reduce<unknown>((current, segment) => {
      if (!segment || !current || typeof current !== 'object') return undefined;
      return (current as Record<string, unknown>)[segment];
    }, record);
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return undefined;
  };

  const getListFieldRawValue = (record: ListRecord, fieldPath?: string): unknown => {
    if (!fieldPath) return undefined;
    const path = fieldPath.trim();
    if (!path) return undefined;
    return path.split('.').reduce<unknown>((current, segment) => {
      if (!segment || !current || typeof current !== 'object') return undefined;
      return (current as Record<string, unknown>)[segment];
    }, record);
  };

  const applyListBindingToNode = (node: UiTreeNode, item: ListRecord): UiTreeNode => {
    const nextNode: UiTreeNode = {
      ...node,
      props: { ...(node.props ?? {}) },
      children: (node.children ?? []).map((child) => applyListBindingToNode(child, item)),
    };
    const binding = (node.props?.__listBinding as { value?: unknown } | undefined)?.value as
      | { prop?: string; field?: string }
      | undefined;
    const bindProp = typeof binding?.prop === 'string' ? binding.prop.trim() : '';
    const bindField = typeof binding?.field === 'string' ? binding.field.trim() : '';
    if (!bindProp || !bindField) return nextNode;
    const rawBoundValue = getListFieldRawValue(item, bindField);
    if (typeof rawBoundValue === 'undefined') return nextNode;
    const targetProp = (nextNode.props?.[bindProp] ?? {}) as Record<string, unknown>;
    nextNode.props = { ...(nextNode.props ?? {}), [bindProp]: { ...targetProp, value: rawBoundValue } };
    return nextNode;
  };

  return {
    getProp, getNumberProp, getStringProp, getBooleanProp, getCalendarValueProp,
    getStyleProp, getStringArrayProp, getFiniteNumberProp, getInputNumberValueProp,
    getSliderValueProp, getStepsCurrentProp, getTimeStepsProp, getTimeRangeValueProp,
    getTabsListProp, getTabsControlledValue, getTabsDefaultValue,
    getMenuValueProp, getMenuValueArrayProp, getMenuWidthProp,
    getBackTopOffsetProp, getBackTopVisibleHeightProp, getBackTopTargetProp,
    getBackTopContainerProp, getBackTopContentNode,
    getBuilderDrawerAttach, getDrawerHeaderProp, getDrawerFooterProp, getDrawerSizeDraggableProp,
    getProgressColorProp, getProgressLabelProp, getProgressSizeProp, getProgressStatusProp,
    getUploadAbridgeNameProp, getUploadFileListProp, getUploadObjectProp,
    getUploadSizeLimitProp, getUploadStatusProp,
    getTextareaStyleProp, getTextareaAutosizeProp,
    getSwiperImages, getListFieldValue, getListFieldRawValue, applyListBindingToNode,
    mergeStyle,
  };
}
