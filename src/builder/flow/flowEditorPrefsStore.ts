import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type FlowEditorPrefsState = {
  /** 拖放/移动节点时是否吸附到网格（与画布 Background 间距一致） */
  flowSnapToGrid: boolean;
  setFlowSnapToGrid: (value: boolean) => void;
};

export const useFlowEditorPrefsStore = create<FlowEditorPrefsState>()(
  persist(
    (set) => ({
      flowSnapToGrid: true,
      setFlowSnapToGrid: (flowSnapToGrid) => set({ flowSnapToGrid }),
    }),
    {
      name: 'urpbuilder-flow-editor',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ flowSnapToGrid: s.flowSnapToGrid }),
    },
  ),
);
