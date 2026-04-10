import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      '@codemirror/view',
      '@codemirror/state',
      '@codemirror/autocomplete',
      '@codemirror/lang-javascript',
      '@codemirror/lang-json',
      '@codemirror/lang-css',
      '@uiw/react-codemirror',
      '@uiw/codemirror-theme-vscode',
    ],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          antd: ['antd', '@ant-design/icons'],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
