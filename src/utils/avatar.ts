import { createAvatar } from '@dicebear/core';
import { identicon } from '@dicebear/collection';

export const DEFAULT_AVATAR_PRESET_COUNT = 24;

const sanitizeSeed = (seed?: string) => {
  const normalized = String(seed || '').trim();
  return normalized || 'urp-user';
};

export const createGithubStyleAvatar = (seed?: string) => {
  const normalizedSeed = sanitizeSeed(seed);
  return createAvatar(identicon, {
    seed: normalizedSeed,
    radius: 50,
  }).toDataUri();
};

export const buildAvatarPresets = (baseSeed?: string, count = DEFAULT_AVATAR_PRESET_COUNT) => {
  const normalizedSeed = sanitizeSeed(baseSeed);
  return Array.from({ length: count }, (_, index) => createGithubStyleAvatar(`${normalizedSeed}-${index + 1}`));
};

export const resolveUserAvatar = (params: {
  avatar?: string;
  id?: string;
  username?: string;
  nickname?: string;
}) => {
  if (params.avatar && String(params.avatar).trim()) {
    return params.avatar;
  }

  const fallbackSeed = params.id || params.username || params.nickname || 'urp-user';
  return createGithubStyleAvatar(fallbackSeed);
};

export const resolveTeamAvatar = (params: {
  avatar?: string;
  id?: string;
  name?: string;
  code?: string;
}) => {
  if (params.avatar && String(params.avatar).trim()) {
    return params.avatar;
  }

  const fallbackSeed = params.id || params.code || params.name || 'urp-team';
  return createGithubStyleAvatar(`team-${fallbackSeed}`);
};

export const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
};
