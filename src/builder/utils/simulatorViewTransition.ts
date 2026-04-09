/**
 * 模拟器组件库切换：纯几何 + Promise 协调（双阶段斜线动画在 SimulatorLibraryBrushOverlay）。
 * 前半场：白遮罩沿对角线盖住旧库；后半场：再挂载新库并第二次斜线揭示（避免全程双树并行挂载）。
 */

export const BRUSH_DURATION_MS = 2000;

/** 前半「清空/盖白」与后半「揭示新库」的分界（0..1 时间轴） */
export const BRUSH_PHASE_SPLIT = 0.5;

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

const clampPx = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * 直线 x+y=threshold 与矩形 [0,w]×[0,h] 的交线段（用于刀光与切割边重合）。
 * 阈值接近铺满时线段过短，返回 null。
 */
export function diagonalCutEdgeSegment(
  width: number,
  height: number,
  threshold: number,
): { cx: number; cy: number; length: number; angleDeg: number } | null {
  if (width <= 0 || height <= 0) {
    return null;
  }
  const w = width;
  const h = height;
  const t = threshold;
  if (t <= 0.5) {
    return null;
  }
  /* 即将铺满，交线缩成一点附近，不再画刀光 */
  if (t >= w + h - 1) {
    return null;
  }

  const candidates: Array<{ x: number; y: number }> = [];
  const push = (x: number, y: number) => {
    const xx = clampPx(x, 0, w);
    const yy = clampPx(y, 0, h);
    if (Math.abs(xx + yy - t) > 1.5) {
      return;
    }
    candidates.push({ x: xx, y: yy });
  };

  if (t >= 0 && t <= w) {
    push(t, 0);
  }
  if (t >= 0 && t <= h) {
    push(0, t);
  }
  if (t >= w && t <= w + h) {
    push(w, t - w);
  }
  if (t >= h && t <= w + h) {
    push(t - h, h);
  }

  const uniq: typeof candidates = [];
  for (const p of candidates) {
    if (!uniq.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 3)) {
      uniq.push(p);
    }
  }
  if (uniq.length < 2) {
    return null;
  }

  let a = uniq[0];
  let b = uniq[1];
  let maxD = 0;
  for (let i = 0; i < uniq.length; i += 1) {
    for (let j = i + 1; j < uniq.length; j += 1) {
      const dx = uniq[i].x - uniq[j].x;
      const dy = uniq[i].y - uniq[j].y;
      const d2 = dx * dx + dy * dy;
      if (d2 > maxD) {
        maxD = d2;
        a = uniq[i];
        b = uniq[j];
      }
    }
  }

  const length = Math.sqrt(maxD);
  if (length < 12) {
    return null;
  }

  return {
    cx: (a.x + b.x) / 2,
    cy: (a.y + b.y) / 2,
    length,
    angleDeg: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
  };
}
