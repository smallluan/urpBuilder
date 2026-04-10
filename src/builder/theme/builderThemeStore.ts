import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ColorMode = 'light' | 'dark';

const STORAGE_KEY = 'urpbuilder-color-mode';

export function applyColorModeToDocument(mode: ColorMode) {
  document.documentElement.setAttribute('theme-mode', mode);
}

function readPersistedColorMode(): ColorMode | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as { state?: { colorMode?: string } };
    const m = parsed?.state?.colorMode;
    if (m === 'dark' || m === 'light') {
      return m;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** 与 store 初始值一致：有记录用记录，否则跟随系统偏好 */
export function getResolvedColorMode(): ColorMode {
  const stored = readPersistedColorMode();
  if (stored) {
    return stored;
  }
  if (typeof window === 'undefined') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

type BuilderThemeState = {
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  toggleColorMode: () => void;
  /**
   * 非 null：主题对角线过渡进行中（View Transitions：新快照 clip 推进，未覆盖处仍为旧快照）。
   */
  themeDiagonalTransition: null | { to: ColorMode };
  /** 亮暗切换：优先走对角线过渡；系统偏好减少动效时等同 toggleColorMode */
  beginThemeDiagonalToggle: () => void;
  endThemeDiagonalTransition: () => void;
};

export const useBuilderThemeStore = create<BuilderThemeState>()(
  persist(
    (set, get) => ({
      colorMode: getResolvedColorMode(),
      themeDiagonalTransition: null,
      setColorMode: (colorMode) => set({ colorMode }),
      toggleColorMode: () => {
        const next = get().colorMode === 'dark' ? 'light' : 'dark';
        set({ colorMode: next });
      },
      endThemeDiagonalTransition: () => set({ themeDiagonalTransition: null }),
      beginThemeDiagonalToggle: () => {
        if (get().themeDiagonalTransition) {
          return;
        }
        if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
          get().toggleColorMode();
          return;
        }
        const to = get().colorMode === 'dark' ? 'light' : 'dark';
        set({ themeDiagonalTransition: { to } });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ colorMode: s.colorMode }),
      onRehydrateStorage: () => (state) => {
        if (state?.colorMode) {
          applyColorModeToDocument(state.colorMode);
        }
      },
    },
  ),
);
