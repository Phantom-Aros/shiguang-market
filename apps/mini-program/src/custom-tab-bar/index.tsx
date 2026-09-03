import { forwardRef, useImperativeHandle, useState } from 'react';
import { Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { Icon, type IconName } from '@shiguang/ui-taro';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import './index.scss';

export interface CustomTabBarRef {
  setSelected: (index: number) => void;
}

const TAB_LIST: Array<{ pagePath: string; text: string; icon: IconName }> = [
  { pagePath: '/pages/index/index', text: '发现', icon: 'discover' },
  { pagePath: '/pages/cart/index', text: '购物车', icon: 'cart' },
  { pagePath: '/pages/profile/index', text: '我的', icon: 'user' },
];

const ACTIVE_COLOR = '#ff6b4a';
const INACTIVE_COLOR = '#636e72';

const CustomTabBar = forwardRef<CustomTabBarRef>((_, ref) => {
  const [selected, setSelected] = useState(0);
  const { isLoggedIn } = useAuth();
  const { itemCount } = useCart();

  useImperativeHandle(ref, () => ({
    setSelected(index: number) {
      setSelected(index);
    },
  }));

  return (
    <View className="custom-tab-bar">
      {TAB_LIST.map((item, index) => {
        const isActive = selected === index;
        const showBadge = item.icon === 'cart' && isLoggedIn && itemCount > 0;

        return (
          <View
            key={item.pagePath}
            className={`custom-tab-bar__item ${isActive ? 'custom-tab-bar__item--active' : ''}`}
            onClick={() => {
              setSelected(index);
              Taro.switchTab({ url: item.pagePath });
            }}
          >
            <View className="custom-tab-bar__icon-wrap">
              <Icon
                name={item.icon}
                size={22}
                filled={isActive}
                color={isActive ? ACTIVE_COLOR : INACTIVE_COLOR}
              />
              {showBadge ? (
                <Text className="custom-tab-bar__badge">
                  {itemCount > 99 ? '99+' : itemCount}
                </Text>
              ) : null}
            </View>
            <Text className="custom-tab-bar__text">{item.text}</Text>
          </View>
        );
      })}
    </View>
  );
});

CustomTabBar.displayName = 'CustomTabBar';

export default CustomTabBar;
