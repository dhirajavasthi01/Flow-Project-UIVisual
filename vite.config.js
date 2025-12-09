import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import federation from '@originjs/vite-plugin-federation';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'uivisual',
      filename: 'remoteEntry.js',
      exposes: {
        './CustomModal': './src/components/models/CustomModal',
        './SvgNode': './src/components/flow/SvgNode',
        './NodeTooltip': './src/components/flow/nodeTooltip/nodeTooltip',
      },
      shared: ['react', 'react-dom', 'tailwindcss', 'jotai', 'react-router-dom', '@mui/material', '@emotion/react', '@emotion/styled', '@xyflow/react'],
    }),
    tailwindcss(),
  ],

  build: {
    assetsInlineLimit: 500_000,
    modulePreload: false,
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
  },

  base: '/flow_uivisuals',

  css: {
    transformer: 'postcss',
  },
});
