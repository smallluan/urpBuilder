export type ScreenSizeOption = { value: string | number; label: string };

export const SCREEN_SIZES: ScreenSizeOption[] = [
  { value: 'auto', label: '自适应' },
  { value: 320, label: 'iPhone SE (320px)' },
  { value: 360, label: 'iPhone 12/13/14 mini (360px)' },
  { value: 375, label: 'iPhone 6/7/8/X/XS/11 Pro (375px)' },
  { value: 390, label: 'iPhone 12/13/14 (390px)' },
  { value: 393, label: 'iPhone 15/16 (393px)' },
  { value: 412, label: '三星 S24 Ultra (412px)' },
  { value: 414, label: 'iPhone 6/7/8 Plus/XR/11 (414px)' },
  { value: 428, label: 'iPhone 12/13/14 Pro Max (428px)' },
  { value: 430, label: 'iPhone 15/16 Pro Max (430px)' },
  { value: 768, label: 'iPad mini (768px)' },
  { value: 834, label: 'iPad Air/Pro 11寸 (834px)' },
  { value: 1024, label: 'iPad Pro 12.9寸 (1024px)' },
];

export default SCREEN_SIZES;