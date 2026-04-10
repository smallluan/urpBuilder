/**
 * 组件版本 diff 目前完全在浏览器侧计算；若模板极大导致卡顿，可后续增加仅返回摘要的后端接口（见计划 optional-api-diff）。
 */
import { createTwoFilesPatch } from 'diff';
import type { ComponentTemplateContent } from '../../api/types';
import { componentTemplateToVirtualFiles, type VirtualFileMap } from './virtualTemplateFiles';

export const LARGE_FILE_CHAR_THRESHOLD = 400_000;

export type FileDiffStats = {
  path: string;
  added: number;
  removed: number;
  changed: boolean;
  tooLarge: boolean;
};

export type FileLineDiff = {
  path: string;
  unified: string;
  added: number;
  removed: number;
  tooLarge: boolean;
};

/**
 * 合并两侧虚拟文件路径并集，计算逐文件文本 diff。
 */
export function diffComponentTemplates(
  base: ComponentTemplateContent,
  compare: ComponentTemplateContent,
): {
  baseFiles: VirtualFileMap;
  compareFiles: VirtualFileMap;
  stats: FileDiffStats[];
  fileDiffs: Map<string, FileLineDiff>;
} {
  const baseFiles = componentTemplateToVirtualFiles(base);
  const compareFiles = componentTemplateToVirtualFiles(compare);
  return diffVirtualFileMaps(baseFiles, compareFiles);
}

export function diffVirtualFileMaps(baseFiles: VirtualFileMap, compareFiles: VirtualFileMap): {
  baseFiles: VirtualFileMap;
  compareFiles: VirtualFileMap;
  stats: FileDiffStats[];
  fileDiffs: Map<string, FileLineDiff>;
} {
  const allPaths = new Set<string>([...baseFiles.keys(), ...compareFiles.keys()]);
  const sorted = [...allPaths].sort((a, b) => a.localeCompare(b));

  const stats: FileDiffStats[] = [];
  const fileDiffs = new Map<string, FileLineDiff>();

  for (const path of sorted) {
    const a = baseFiles.get(path) ?? '';
    const b = compareFiles.get(path) ?? '';
    const tooLarge = a.length > LARGE_FILE_CHAR_THRESHOLD || b.length > LARGE_FILE_CHAR_THRESHOLD;

    if (a === b) {
      stats.push({ path, added: 0, removed: 0, changed: false, tooLarge });
      continue;
    }

    if (tooLarge) {
      stats.push({
        path,
        added: 0,
        removed: 0,
        changed: true,
        tooLarge: true,
      });
      fileDiffs.set(path, {
        path,
        unified: `--- ${path} (base)\n+++ ${path} (compare)\n内容过大（>${LARGE_FILE_CHAR_THRESHOLD} 字符），已跳过行 diff。请下载或在本地对比。\n`,
        added: 0,
        removed: 0,
        tooLarge: true,
      });
      continue;
    }

    const unified = createTwoFilesPatch(`a/${path}`, `b/${path}`, a, b, '(base)', '(compare)', { context: 3 });
    let added = 0;
    let removed = 0;
    for (const line of unified.split('\n')) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        added += 1;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        removed += 1;
      }
    }

    stats.push({ path, added, removed, changed: true, tooLarge: false });
    fileDiffs.set(path, { path, unified, added, removed, tooLarge: false });
  }

  return { baseFiles, compareFiles, stats, fileDiffs };
}
