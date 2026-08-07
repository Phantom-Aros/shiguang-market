import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const scrollPositions = new Map<string, number>();

export function buildScrollKey(storageKey: string, locationKey: string) {
  return `${storageKey}:${locationKey}`;
}

/** 跳转前显式保存，避免卸载时 window.scrollY 已被其他页面改写 */
export function rememberScrollPosition(key: string, top: number) {
  scrollPositions.set(key, top);
}

/** 前进导航（PUSH/REPLACE）时滚到顶部，避免继承上一页滚动位置 */
export function useScrollToTopOnForwardNav(watchKey?: string) {
  const navigationType = useNavigationType();

  useLayoutEffect(() => {
    if (navigationType === 'POP') return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [navigationType, watchKey]);
}

/**
 * 记录并恢复列表页滚动。
 * 返回 restoreTarget 供 FeedGrid 在布局稳定后应用（瀑布流高度是异步测量的）。
 */
export function useScrollRestoration(storageKey: string) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const key = buildScrollKey(storageKey, location.key);
  const [restoreTarget, setRestoreTarget] = useState<number | null>(null);
  const lastScrollRef = useRef(scrollPositions.get(key) ?? 0);
  const isRestoringRef = useRef(false);

  useEffect(() => {
    lastScrollRef.current = scrollPositions.get(key) ?? lastScrollRef.current;

    const save = () => {
      if (isRestoringRef.current) return;
      lastScrollRef.current = window.scrollY;
      scrollPositions.set(key, lastScrollRef.current);
    };

    window.addEventListener('scroll', save, { passive: true });
    return () => {
      window.removeEventListener('scroll', save);
      // 只用本页记录的最后位置，不用卸载瞬间的 window.scrollY（可能已是详情页滚动值）
      scrollPositions.set(key, lastScrollRef.current);
    };
  }, [key]);

  useLayoutEffect(() => {
    if (navigationType === 'POP') {
      const saved = scrollPositions.get(key);
      if (saved !== undefined && saved > 0) {
        isRestoringRef.current = true;
        lastScrollRef.current = saved;
        setRestoreTarget(saved);
        return;
      }
    }

    isRestoringRef.current = false;
    setRestoreTarget(null);
  }, [key, navigationType]);

  const acknowledgeRestore = () => {
    isRestoringRef.current = false;
    lastScrollRef.current = scrollPositions.get(key) ?? lastScrollRef.current;
    setRestoreTarget(null);
  };

  return { scrollKey: key, restoreTarget, acknowledgeRestore };
}
