import { create } from 'zustand';
import type { CreateComponentStore } from './type';

export const useCreateComponentStore = create<CreateComponentStore>((set) => ({
  screenSize: 'auto',
  autoWidth: 1800,
  setScreenSize: (screenSize) => set({ screenSize }),
  setAutoWidth: (width) => set({ autoWidth: width }),
}));
