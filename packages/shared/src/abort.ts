/** 与 AbortSignal 兼容的最小接口，供小程序等无原生 AbortController 的环境使用 */
export interface AbortSignalLike {
  readonly aborted: boolean;
  addEventListener(type: 'abort', listener: () => void): void;
  removeEventListener(type: 'abort', listener: () => void): void;
}

export interface AbortControllerLike {
  readonly signal: AbortSignalLike;
  abort(): void;
}

function createAbortControllerPolyfill(): AbortControllerLike {
  const listeners = new Set<() => void>();
  let aborted = false;

  const signal: AbortSignalLike = {
    get aborted() {
      return aborted;
    },
    addEventListener(_type, listener) {
      listeners.add(listener);
    },
    removeEventListener(_type, listener) {
      listeners.delete(listener);
    },
  };

  return {
    signal,
    abort() {
      if (aborted) return;
      aborted = true;
      listeners.forEach((listener) => listener());
    },
  };
}

/** 创建可取消信号；小程序无 AbortController 时自动降级为 polyfill */
export function createAbortController(): AbortControllerLike {
  if (typeof AbortController !== 'undefined') {
    return new AbortController();
  }
  return createAbortControllerPolyfill();
}
