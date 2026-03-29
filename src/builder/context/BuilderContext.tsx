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

import React, { createContext, useContext, useEffect, useMemo } from 'react';
import type { StoreApi, UseBoundStore } from 'zustand';
import type { BuilderStore } from '../store/types';
import { setBuilderDragPreviewContext } from '../utils/builderDragPreviewBridge';

type BuilderStoreHook = UseBoundStore<StoreApi<BuilderStore>>;
export type BuilderEntityType = 'component' | 'page';

export interface BuilderContextValue {
  useStore: BuilderStoreHook;
  readOnly: boolean;
  readOnlyReason?: string;
  entityType: BuilderEntityType;
}

const BuilderContext = createContext<BuilderContextValue | null>(null);

export interface BuilderProviderProps {
  /** 当前页面的 builder store hook（如 useCreateComponentStore） */
  useStore: BuilderStoreHook;
  readOnly?: boolean;
  readOnlyReason?: string;
  entityType?: BuilderEntityType;
  children: React.ReactNode;
}

export const BuilderProvider: React.FC<BuilderProviderProps> = ({
  useStore,
  readOnly = false,
  readOnlyReason,
  entityType = 'component',
  children,
}) => {
  const value = useMemo<BuilderContextValue>(
    () => ({ useStore, readOnly, readOnlyReason, entityType }),
    [useStore, readOnly, readOnlyReason, entityType],
  );

  useEffect(() => {
    setBuilderDragPreviewContext(value);
    return () => setBuilderDragPreviewContext(null);
  }, [value]);

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
