import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ResourceVisibility, TemplateStatus } from '../api/types';

export type ResourceScope = 'mine' | 'team' | 'all';

export interface ResourceFilterSlice {
  query: string;
  scope: ResourceScope;
  statusFilter: 'all' | TemplateStatus;
  visibilityFilter: 'all' | ResourceVisibility;
  pageSize: number;
  scopeTouched: boolean;
}

interface ResourceFiltersState {
  buildPage: ResourceFilterSlice;
  buildComponent: ResourceFilterSlice;
  setBuildPageFilters: (payload: Partial<ResourceFilterSlice>) => void;
  setBuildComponentFilters: (payload: Partial<ResourceFilterSlice>) => void;
}

const createDefaultFilters = (): ResourceFilterSlice => ({
  query: '',
  scope: 'mine',
  statusFilter: 'all',
  visibilityFilter: 'all',
  pageSize: 10,
  scopeTouched: false,
});

export const useResourceFiltersStore = create<ResourceFiltersState>()(
  persist(
    (set) => ({
      buildPage: createDefaultFilters(),
      buildComponent: createDefaultFilters(),
      setBuildPageFilters: (payload) =>
        set((state) => ({
          buildPage: {
            ...state.buildPage,
            ...payload,
          },
        })),
      setBuildComponentFilters: (payload) =>
        set((state) => ({
          buildComponent: {
            ...state.buildComponent,
            ...payload,
          },
        })),
    }),
    {
      name: 'urp-builder:resource-filters:v1',
    },
  ),
);
