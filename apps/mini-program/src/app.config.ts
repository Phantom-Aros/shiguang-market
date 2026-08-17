export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/post-detail/index',
    'pages/profile/index',
    'pages/pay/index',
    'pages/campaign/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: '拾光市集',
    navigationBarTextStyle: 'black',
  },
  tabBar: {
    custom: true,
    color: '#636e72',
    selectedColor: '#ff6b4a',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '发现',
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
      },
    ],
  },
});
