import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    process.env.ANALYZE === '1' &&
      visualizer({
        filename: 'dist/stats.html',
        gzipSize: true,
        open: false,
      }),
  ].filter(Boolean),
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
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/react-router')) {
            return 'vendor-router';
          }
          if (id.includes('/pages/BuilderPage')) {
            return 'page-builder';
          }
          if (id.includes('/pages/CampaignPage')) {
            return 'page-campaign';
          }
          if (id.includes('/blocks/HeroBannerBlock')) {
            return 'block-hero';
          }
          if (id.includes('/blocks/CountdownBlock')) {
            return 'block-countdown';
          }
          if (id.includes('/blocks/ProductGridBlock')) {
            return 'block-product-grid';
          }
          if (id.includes('/blocks/RichTextBlock')) {
            return 'block-rich-text';
          }
          if (id.includes('/blocks/CouponBannerBlock')) {
            return 'block-coupon';
          }
        },
      },
    },
  },
});
