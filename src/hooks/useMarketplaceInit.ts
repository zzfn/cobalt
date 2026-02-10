import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

/**
 * 初始化市场数据源
 * 首次启动时从内置数据源初始化
 */
export function useMarketplaceInit() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initMarketplace = async () => {
      try {
        // 调用 Rust 命令初始化内置数据源
        await invoke('init_default_sources');
        setIsInitialized(true);
      } catch (err) {
        console.error('❌ 数据源初始化失败:', err);
        setError(err instanceof Error ? err.message : '初始化失败');
        // 即使失败也标记为已初始化，避免阻塞应用
        setIsInitialized(true);
      }
    };

    initMarketplace();
  }, []);

  return { isInitialized, error };
}
