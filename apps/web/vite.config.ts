import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        configure: (proxy) => {
          // 禁用 SSE 代理缓冲，否则 token 会攒在一起一次性到达前端
          proxy.on('proxyRes', (proxyRes) => {
            const contentType = proxyRes.headers['content-type'];
            if (contentType && String(contentType).includes('text/event-stream')) {
              proxyRes.headers['cache-control'] = 'no-cache, no-transform';
              proxyRes.headers['x-accel-buffering'] = 'no';
              delete proxyRes.headers['content-length'];
            }
          });
        },
      },
    },
  },
});
