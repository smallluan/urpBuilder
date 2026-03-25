import type { DragEvent } from 'react';

/** 与素材库卡片、画布 Image/Avatar、属性栏拖放共用 */
export const URP_MEDIA_ASSET_DRAG_MIME = 'application/x-urp-media-asset';

export function setMediaAssetDragData(
  e: DragEvent,
  payload: { url: string; name?: string },
): void {
  const url = payload.url?.trim();
  if (!url) {
    return;
  }
  e.dataTransfer.effectAllowed = 'copy';
  e.dataTransfer.setData('text/plain', url);
  e.dataTransfer.setData(URP_MEDIA_ASSET_DRAG_MIME, JSON.stringify({ url, name: payload.name }));
}

export function getMediaAssetUrlFromDrop(e: DragEvent): string | null {
  const raw = e.dataTransfer.getData(URP_MEDIA_ASSET_DRAG_MIME);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { url?: string };
      if (parsed.url?.trim()) {
        return parsed.url.trim();
      }
    } catch {
      //
    }
  }
  const plain = e.dataTransfer.getData('text/plain')?.trim();
  if (plain && /^https?:\/\//i.test(plain)) {
    return plain;
  }
  return null;
}
