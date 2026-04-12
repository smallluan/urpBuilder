/** 与后端 changePassword 中 isStrongPassword 规则对齐（注册建议一致） */
export function validatePasswordStrength(password: string): string | undefined {
  if (!password) {
    return '请输入密码';
  }
  if (password.length < 8 || password.length > 128) {
    return '密码长度为 8～128 位';
  }
  const hasLetter = /[a-z]/i.test(password);
  const hasNumber = /\d/.test(password);
  if (!hasLetter || !hasNumber) {
    return '密码需同时包含字母与数字';
  }
  return undefined;
}

export function validateUsername(username: string): string | undefined {
  const t = username.trim();
  if (!t) {
    return '请输入登录账号';
  }
  if (t.length < 2) {
    return '登录账号至少 2 个字符';
  }
  if (t.length > 64) {
    return '登录账号不超过 64 个字符';
  }
  return undefined;
}

export function validateNickname(nickname: string): string | undefined {
  if (nickname.trim().length > 64) {
    return '昵称不超过 64 个字符';
  }
  return undefined;
}
