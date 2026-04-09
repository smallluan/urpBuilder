import type React from 'react';
import type { UiDropDataHandler, UiTreeNode } from '../store/types';
import type { ListRecord, SwiperImageItem } from '../../types/component';
import type { TabsPanelItem } from '../utils/tabs';

export type { TabsPanelItem };

export interface ComponentRenderContext {
  data: UiTreeNode | undefined;
  onDropData: UiDropDataHandler | undefined;
  // Prop accessors
  getProp: (propName: string) => unknown;
  getNumberProp: (propName: string) => number | undefined;
  getStringProp: (propName: string) => string | undefined;
  getBooleanProp: (propName: string) => boolean | undefined;
  getCalendarValueProp: (propName: string) => string | Date | undefined;
  getStyleProp: () => React.CSSProperties | undefined;
  getStringArrayProp: (propName: string) => string[];
  getFiniteNumberProp: (propName: string) => number | undefined;
  getInputNumberValueProp: (propName: string) => number | string | undefined;
  getSliderValueProp: (propName: string) => number | [number, number] | undefined;
  getStepsCurrentProp: (propName: string) => string | number | undefined;
  getTimeStepsProp: () => number[];
  getTimeRangeValueProp: (propName: string) => string[] | undefined;
  getTabsListProp: () => TabsPanelItem[];
  getTabsControlledValue: () => string | number | undefined;
  getTabsDefaultValue: () => string | number | undefined;
  getMenuValueProp: (propName: string) => string | number | undefined;
  getMenuValueArrayProp: (propName: string) => Array<string | number> | undefined;
  getMenuWidthProp: (propName: string) => string | number | Array<string | number> | undefined;
  getBackTopOffsetProp: (propName: string) => [string | number, string | number] | undefined;
  getBackTopVisibleHeightProp: (propName: string) => string | number | undefined;
  getBackTopTargetProp: (propName: string) => string;
  getBackTopContainerProp: () => () => HTMLElement;
  getBackTopContentNode: () => React.ReactNode;
  getBuilderDrawerAttach: () => () => HTMLElement;
  getDrawerHeaderProp: () => string | boolean;
  getDrawerFooterProp: () => boolean;
  getDrawerSizeDraggableProp: () => boolean | { min: number; max: number } | undefined;
  getProgressColorProp: (propName: string) => string | string[] | Record<string, string> | undefined;
  getProgressLabelProp: () => string | boolean;
  getProgressSizeProp: (propName: string) => string | number | undefined;
  getProgressStatusProp: () => string | undefined;
  getUploadAbridgeNameProp: (propName: string) => [number, number] | undefined;
  getUploadFileListProp: (propName: string) => Array<Record<string, unknown>> | undefined;
  getUploadObjectProp: (propName: string) => Record<string, unknown> | undefined;
  getUploadSizeLimitProp: (propName: string) => number | Record<string, unknown> | undefined;
  getUploadStatusProp: (propName: string) => string | undefined;
  getTextareaStyleProp: () => React.CSSProperties | undefined;
  getTextareaAutosizeProp: () => boolean | { minRows?: number; maxRows?: number } | undefined;
  getSwiperImages: () => SwiperImageItem[];
  getListFieldValue: (record: ListRecord, fieldPath?: string) => string | undefined;
  getListFieldRawValue: (record: ListRecord, fieldPath?: string) => unknown;
  applyListBindingToNode: (node: UiTreeNode, item: ListRecord) => UiTreeNode;
  renderBuilderMenuNodes: (nodes?: UiTreeNode[]) => React.ReactNode;
  mergeStyle: (baseStyle?: React.CSSProperties) => React.CSSProperties | undefined;
  handleActivateSelf: (event: React.MouseEvent<HTMLElement>) => void;
  isNodeActive: boolean;
  /** 当前选中节点是否在本节点子树内（含自身），用于抽屉等：点内部子组件时仍视为「在本容器上下文中」。 */
  isSubtreeActive: boolean;
  // Space props
  spaceDirection: 'horizontal' | 'vertical' | undefined;
  isSpaceSplitEnabled: boolean;
  spaceSplitLayout: 'horizontal' | 'vertical';
  spaceSplitContent: string | undefined;
  spaceSplitAlign: any;
  spaceSplitDashed: boolean | undefined;
  // Grid props
  responsiveColLayout: { span: number; offset: number };
  // Card slot
  cardHeaderSlotNode: UiTreeNode | undefined;
  cardBodySlotNode: UiTreeNode | undefined;
  hasCardSlotStructure: boolean;
  // Tabs state
  tabsInnerValue: string | number | undefined;
  setTabsInnerValue: (value: string | number | undefined) => void;
  setActiveNode: (key: string) => void;
  updateActiveNodeProp: (propKey: string, value: unknown) => void;
}

export type ComponentRenderer = (ctx: ComponentRenderContext) => React.ReactElement | null;
export type ComponentRegistry = Map<string, ComponentRenderer>;
