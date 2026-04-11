import type { AuthUser } from '../auth/types';

/**
 * 界面展示名：优先昵称，否则为登录账号（username）。
 * 与后端字段一致：username = 登录账号；nickname = 展示昵称（可选）。
 */
export function getUserDisplayName(user: AuthUser | null | undefined): string {
  if (!user) {
    return '未登录';
  }
  const nick = typeof user.nickname === 'string' ? user.nickname.trim() : '';
  return nick || user.username;
}

/** 头像等处的短字符：取展示名前 1～2 字 */
export function getUserDisplayInitials(user: AuthUser | null | undefined): string {
  const name = getUserDisplayName(user);
  if (name === '未登录') {
    return '?';
  }
  return name.trim().slice(0, 2);
}

export function hasDisplayNickname(user: AuthUser | null | undefined): boolean {
  return Boolean(user && typeof user.nickname === 'string' && user.nickname.trim().length > 0);
}
