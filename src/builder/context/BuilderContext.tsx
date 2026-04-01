/**
 * BuilderContext —— 通用 Builder store 上下文。
 *
 * 作用：让 builder 内的共享 UI 组件（如 BuilderShell 的子节点）
 * 能够通过 useBuilderContext() 访问当前页面注入的 store，
 * 而无需关心是 CreateComponent 还是 CreatePage 的具体 store 实例。
 *
 * 用法：
 *   // 页面入口处注入
 *   <BuilderProvider useStore={useCreateComponentStore}>
 *     <CreateComponent />
 *   </BuilderProvider>
 *
 *   // 共享子组件中消费
 *   const { useStore } = useBuilderContext();
 *   const screenSize = useStore((s) => s.screenSize);
 */

import React, { createContext, useContext, useMemo } from 'react';
import type { StoreApi, UseBoundStore } from 'zustand';
import type { BuilderStore } from '../store/types';

type BuilderStoreHook = UseBoundStore<StoreApi<BuilderStore>>;
export type BuilderEntityType = 'component' | 'page';

/** 与页面 Header 模式一致：流程画布与搭建 UI 可能同时挂载（keepalive），用于避免快捷键双触发。 */
export type BuilderViewMode = 'component' | 'flow';

export interface BuilderContextValue {
  useStore: BuilderStoreHook;
  readOnly: boolean;
  readOnlyReason?: string;
  entityType: BuilderEntityType;
  builderViewMode: BuilderViewMode;
}

/** 预览挂载等场景仅用 Provider、勿反复写全局 bridge 时请用此 Context，勿用 BuilderProvider 包一层。 */
export const BuilderContext = createContext<BuilderContextValue | null>(null);

export interface BuilderProviderProps {
  /** 当前页面的 builder store hook（如 useCreateComponentStore） */
  useStore: BuilderStoreHook;
  readOnly?: boolean;
  readOnlyReason?: string;
  entityType?: BuilderEntityType;
  /** 当前可见模式；流程模式下搭建画布应让出 C/V 等与流程冲突的快捷键 */
  builderViewMode?: BuilderViewMode;
  children: React.ReactNode;
}

export const BuilderProvider: React.FC<BuilderProviderProps> = ({
  useStore,
  readOnly = false,
  readOnlyReason,
  entityType = 'component',
  builderViewMode = 'component',
  children,
}) => {
  const value = useMemo<BuilderContextValue>(
    () => ({ useStore, readOnly, readOnlyReason, entityType, builderViewMode }),
    [useStore, readOnly, readOnlyReason, entityType, builderViewMode],
  );

  return <BuilderContext.Provider value={value}>{children}</BuilderContext.Provider>;
};

/**
 * 获取当前上下文中注入的 builder store hook。
 * 必须在 BuilderProvider 内使用。
 */
export const useBuilderContext = (): BuilderContextValue => {
  const ctx = useContext(BuilderContext);
  if (!ctx) {
    throw new Error('useBuilderContext 必须在 <BuilderProvider> 内使用');
  }
  return ctx;
};

export const useBuilderAccess = () => {
  const { readOnly, readOnlyReason } = useBuilderContext();
  return {
    readOnly,
    readOnlyReason,
  };
};
