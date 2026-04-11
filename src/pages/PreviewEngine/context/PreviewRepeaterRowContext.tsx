import React from 'react';

export interface RepeaterRowScope {
  item: Record<string, unknown>;
  index: number;
  rowKey: string | number;
}

export const PreviewRepeaterRowContext = React.createContext<RepeaterRowScope | null>(null);
