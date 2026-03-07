import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { CreateComponentStore } from './type';

export const useCreateComponentStore = create<CreateComponentStore>((set) => ({
  screenSize: 'auto',
  autoWidth: 1800,
  uiTreeData: {
    key: uuidv4(),
    label: '该组件',
    children: []
  },
  setScreenSize: (screenSize) => set({ screenSize }),
  setAutoWidth: (width) => set({ autoWidth: width }),
}));
