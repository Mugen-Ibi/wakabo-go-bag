// デバウンス関数のユーティリティ
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      (func as (...args: Parameters<T>) => unknown)(...args);
    }, delay);
  };
}

// スロットル関数のユーティリティ
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastExecTime = 0;
  
  return (...args: Parameters<T>) => {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime >= delay) {
      (func as (...args: Parameters<T>) => unknown)(...args);
      lastExecTime = currentTime;
    }
  };
}
