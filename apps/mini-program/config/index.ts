import { defineConfig } from '@tarojs/cli';
import path from 'node:path';
import devConfig from './dev';
import prodConfig from './prod';

export default defineConfig(async (merge) => {
  const baseConfig = {
    projectName: 'shiguang-mini-program',
    date: '2026-8-14',
    designWidth: 750,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      375: 2,
      828: 1.81 / 2,
    },
    sourceRoot: 'src',
    outputRoot: 'dist',
    plugins: [],
    defineConstants: {},
    copy: {
      patterns: [],
      options: {},
    },
    framework: 'react',
    compiler: {
      type: 'webpack5',
      // monorepo 下 enhanced-resolve 版本与 Taro 3.6 预编译不兼容，关闭后走正常 webpack 编译
      prebundle: {
        enable: false,
      },
    },
    cache: {
      enable: false,
    },
    compile: {
      include: [
        path.resolve(__dirname, '../../../packages/shared/src'),
        path.resolve(__dirname, '../../../packages/api-client/src'),
        path.resolve(__dirname, '../../../packages/ui-taro/src'),
        path.resolve(__dirname, '../../../packages/icons/src'),
        path.resolve(__dirname, '../../../packages/campaign-schema/src'),
        path.resolve(__dirname, '../../../packages/campaign-taro/src'),
      ],
    },
    alias: {
      '@': path.resolve(__dirname, '..', 'src'),
      '@shiguang/shared': path.resolve(__dirname, '../../../packages/shared/src'),
      '@shiguang/api-client': path.resolve(__dirname, '../../../packages/api-client/src'),
      '@shiguang/icons': path.resolve(__dirname, '../../../packages/icons/src'),
      '@shiguang/ui-taro': path.resolve(__dirname, '../../../packages/ui-taro/src'),
      '@shiguang/campaign-schema': path.resolve(__dirname, '../../../packages/campaign-schema/src'),
      '@shiguang/campaign-taro': path.resolve(__dirname, '../../../packages/campaign-taro/src'),
    },
    mini: {
      postcss: {
        pxtransform: {
          enable: true,
          config: {},
        },
        cssModules: {
          enable: false,
        },
      },
      sass: {
        resource: [
          path.resolve(__dirname, '../../../packages/ui-taro/src/styles/tokens.scss'),
        ],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      webpackChain(chain: any) {
        const packagesRoot = path.resolve(__dirname, '../../../packages');
        chain.module
          .rule('script')
          .include.add(packagesRoot);
        chain.resolve.merge({
          extensionAlias: {
            '.js': ['.ts', '.tsx', '.js'],
            '.mjs': ['.mts', '.mjs'],
          },
        });
      },
    },
  };

  if (process.env.NODE_ENV === 'development') {
    return merge({}, baseConfig, devConfig);
  }
  return merge({}, baseConfig, prodConfig);
});
