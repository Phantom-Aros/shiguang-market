import { forwardRef, useImperativeHandle, useState } from 'react';
import { Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { Icon, type IconName } from '@shiguang/ui-taro';
import './index.scss';

export interface CustomTabBarRef {
  setSelected: (index: number) => void;
}

const TAB_LIST: Array<{ pagePath: string; text: string; icon: IconName }> = [
  { pagePath: '/pages/index/index', text: '发现', icon: 'discover' },
  { pagePath: '/pages/profile/index', text: '我的', icon: 'user' },
];

const ACTIVE_COLOR = '#ff6b4a';
const INACTIVE_COLOR = '#636e72';

const CustomTabBar = forwardRef<CustomTabBarRef>((_, ref) => {
  const [selected, setSelected] = useState(0);

  useImperativeHandle(ref, () => ({
    setSelected(index: number) {
      setSelected(index);
    },
  }));

  return (
    <View className="custom-tab-bar">
      {TAB_LIST.map((item, index) => {
        const isActive = selected === index;
        return (
          <View
            key={item.pagePath}
            className={`custom-tab-bar__item ${isActive ? 'custom-tab-bar__item--active' : ''}`}
            onClick={() => {
              setSelected(index);
              Taro.switchTab({ url: item.pagePath });
            }}
          >
            <Icon
              name={item.icon}
              size={22}
              filled={isActive}
              color={isActive ? ACTIVE_COLOR : INACTIVE_COLOR}
            />
            <Text className="custom-tab-bar__text">{item.text}</Text>
          </View>
        );
      })}
    </View>
  );
});

CustomTabBar.displayName = 'CustomTabBar';

export default CustomTabBar;
