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

import React, { createContext, useContext } from 'react';
import type { StoreApi, UseBoundStore } from 'zustand';
import type { BuilderStore } from '../store/types';

type BuilderStoreHook = UseBoundStore<StoreApi<BuilderStore>>;

interface BuilderContextValue {
  useStore: BuilderStoreHook;
}

const BuilderContext = createContext<BuilderContextValue | null>(null);

export interface BuilderProviderProps {
  /** 当前页面的 builder store hook（如 useCreateComponentStore） */
  useStore: BuilderStoreHook;
  children: React.ReactNode;
}

export const BuilderProvider: React.FC<BuilderProviderProps> = ({ useStore, children }) => (
  <BuilderContext.Provider value={{ useStore }}>
    {children}
  </BuilderContext.Provider>
);

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
