/**
 * 搭建器物料插画统一主题：企业级后台常见的冷灰中性 + 单一主色，
 * 避免多色相「插画感」，与 TDesign / Ant Design 类控制台气质一致。
 */
export const LibIllustrationTheme = {
  /** 主色阶 */
  primary: '#2563eb',
  primaryMid: '#3b82f6',
  primaryLight: '#93c5fd',
  primarySoft: '#dbeafe',
  primaryDark: '#1e40af',
  /** 中性 */
  surface: '#f8fafc',
  surface2: '#f1f5f9',
  border: '#cbd5e1',
  borderStrong: '#94a3b8',
  ink: '#475569',
  inkMuted: '#64748b',
  inkDark: '#334155',
  /** 深底（图表等） */
  panel: '#1e293b',
  /** 弱语义：仍保持偏冷色，避免大红大绿块面 */
  positive: '#0d9488',
  positiveSoft: '#ccfbf1',
  caution: '#b45309',
  cautionSoft: '#fef3c7',
  risk: '#b91c1c',
  /** 投影椭圆 */
  ground: 'rgba(15, 23, 42, 0.07)',
  white: '#ffffff',
  /** 渐变用：自浅至深主色 */
  gradPrimaryStart: '#bfdbfe',
  gradPrimaryEnd: '#1d4ed8',
  gradNeutralStart: '#f1f5f9',
  gradNeutralEnd: '#94a3b8',
  /** 图表柱等：同主色阶微差 */
  barMuted: '#e2e8f0',
  barMid: '#bfdbfe',
  barStrong: '#93c5fd',
} as const;
