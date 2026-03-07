export type ScreenSize = string | number;

export interface CreateComponentStore {
  screenSize: ScreenSize;
  autoWidth: number;
  setScreenSize: (screenSize: ScreenSize) => void;
  setAutoWidth: (width: number) => void;
}
