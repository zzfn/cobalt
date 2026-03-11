import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 将 Git 仓库地址转换为可在浏览器中打开的地址。
 * 例如: git@github.com:user/repo.git -> https://github.com/user/repo
 */
export function toBrowsableRepoUrl(url: string): string {
  const trimmed = url.trim();
  const sshMatch = trimmed.match(/^git@([^:]+):(.+?)(?:\.git)?$/);

  if (sshMatch) {
    const [, host, path] = sshMatch;
    return `https://${host}/${path}`;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed.replace(/\.git$/, '');
  }

  return trimmed;
}

/**
 * 从未知错误对象中提取错误消息
 */
export function getErrorMessage(err: unknown, fallback = '未知错误'): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return fallback;
}
