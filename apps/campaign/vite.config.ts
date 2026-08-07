import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'block-hero': ['./src/blocks/HeroBannerBlock.tsx'],
          'block-countdown': ['./src/blocks/CountdownBlock.tsx'],
          'block-product-grid': ['./src/blocks/ProductGridBlock.tsx'],
          'block-rich-text': ['./src/blocks/RichTextBlock.tsx'],
          'block-coupon': ['./src/blocks/CouponBannerBlock.tsx'],
        },
      },
    },
  },
});
