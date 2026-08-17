import { useDidShow } from '@tarojs/taro';
import Taro from '@tarojs/taro';
import type { CustomTabBarRef } from '../custom-tab-bar';

/** Tab 页 onShow 时同步自定义 TabBar 选中态 */
export function useTabBarSelected(index: number) {
  useDidShow(() => {
    const page = Taro.getCurrentInstance().page;
    if (!page) return;
    const tabbar = Taro.getTabBar<CustomTabBarRef>(page);
    tabbar?.setSelected(index);
  });
}
