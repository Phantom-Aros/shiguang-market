import { useState } from 'react';
import { Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { Button, Loading } from '@shiguang/ui-taro';
import { useAuth } from '../../contexts/AuthContext';
import { useTabBarSelected } from '../../hooks/useTabBarSelected';
import './index.scss';

export default function ProfilePage() {
  useTabBarSelected(1);
  const { user, loading, isLoggedIn, loginWithWechat, logout } = useAuth();
  const [loggingIn, setLoggingIn] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogin = async () => {
    setLoggingIn(true);
    try {
      await loginWithWechat();
    } catch (err) {
      const message = err instanceof Error ? err.message : '登录失败';
      Taro.showToast({ title: message, icon: 'none' });
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  const openPayDemo = () => {
    Taro.navigateTo({ url: '/pages/pay/index' });
  };

  if (loading) {
    return <Loading tip="加载中…" block />;
  }

  return (
    <View className="profile-page safe-bottom">
      {isLoggedIn && user ? (
        <>
          <View className="profile-card">
            <View className="profile-avatar">
              <Text>{user.nickname?.[0] ?? '用'}</Text>
            </View>
            <View className="profile-info">
              <Text className="profile-name">{user.nickname ?? '未设置昵称'}</Text>
              <Text className="profile-meta">ID：{user.userId}</Text>
              {user.phone && <Text className="profile-meta">手机：{user.phone}</Text>}
              <Text className="profile-meta">
                注册：{new Date(user.createdAt).toLocaleDateString('zh-CN')}
              </Text>
            </View>
          </View>

          <View className="profile-menu">
            <View className="profile-menu-item" onClick={openPayDemo}>
              <Text className="profile-menu-label">模拟支付</Text>
              <Text className="profile-menu-desc">体验下单支付流程（Mock）</Text>
            </View>
          </View>

          <Button variant="danger" block loading={loggingOut} onClick={() => void handleLogout()}>
            退出登录
          </Button>
        </>
      ) : (
        <View className="profile-login">
          <Text className="profile-login-title">登录拾光市集</Text>
          <Text className="profile-login-desc">使用微信账号登录，同步点赞与收藏</Text>
          <Button variant="primary" block loading={loggingIn} onClick={() => void handleLogin()}>
            微信一键登录
          </Button>
        </View>
      )}
    </View>
  );
}
