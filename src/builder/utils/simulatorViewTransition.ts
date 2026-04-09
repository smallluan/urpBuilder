/**
 * 模拟器组件库切换：纯几何 + Promise 协调（双 DOM 叠层动画在 SimulatorLibraryBrushOverlay）。
 */

export const BRUSH_DURATION_MS = 2000;

export type SimulatorViewTransitionOutcome = 'completed' | 'aborted';

type Point = {
  x: number;
  y: number;
};

let pendingResolve: ((outcome: SimulatorViewTransitionOutcome) => void) | null = null;

/** 新一次切换会结束上一笔 Promise（aborted） */
export function startSimulatorLibraryTransitionRun(): Promise<SimulatorViewTransitionOutcome> {
  pendingResolve?.('aborted');
  return new Promise((resolve) => {
    pendingResolve = resolve;
  });
}

export function endSimulatorLibraryTransitionRun(outcome: SimulatorViewTransitionOutcome): void {
  pendingResolve?.(outcome);
  pendingResolve = null;
}

/** 矩形内满足 x+y<=threshold 的区域（新层自上而下增长，与旧层位图裁剪互补） */
export function clipRectByDiagonalLess(width: number, height: number, threshold: number): Point[] {
  const source: Point[] = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ];

  const isInside = (p: Point) => p.x + p.y <= threshold;
  const intersect = (a: Point, b: Point): Point => {
    const delta = b.x - a.x + (b.y - a.y);
    if (delta === 0) {
      return { x: a.x, y: a.y };
    }
    const t = (threshold - a.x - a.y) / delta;
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
    };
  };

  const result: Point[] = [];
  for (let i = 0; i < source.length; i += 1) {
    const current = source[i];
    const previous = source[(i + source.length - 1) % source.length];
    const currentInside = isInside(current);
    const previousInside = isInside(previous);

    if (currentInside) {
      if (!previousInside) {
        result.push(intersect(previous, current));
      }
      result.push(current);
    } else if (previousInside) {
      result.push(intersect(previous, current));
    }
  }

  return result;
}

export function toClipPath(points: Point[], width: number, height: number): string {
  if (points.length === 0 || width <= 0 || height <= 0) {
    return 'polygon(0 0, 0 0, 0 0)';
  }
  return `polygon(${points
    .map((p) => `${(p.x / width) * 100}% ${(p.y / height) * 100}%`)
    .join(', ')})`;
}
