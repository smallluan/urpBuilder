export const formatBytes = (n: number) => {
  if (!Number.isFinite(n) || n < 0) {
    return '-';
  }
  if (n < 1024) {
    return `${n} B`;
  }
  if (n < 1024 * 1024) {
    return `${(n / 1024).toFixed(1)} KB`;
  }
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

export const assetTypeLabel = (type: string) => {
  if (type === 'image') {
    return '图片';
  }
  if (type === 'icon') {
    return '图标';
  }
  return '其他';
};
