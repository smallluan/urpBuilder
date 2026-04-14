import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import mdx from '@mdx-js/rollup'
import react from '@vitejs/plugin-react'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import { defineConfig } from 'vitest/config'

const __dirname = dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    mdx({
      remarkPlugins: [remarkGfm],
      rehypePlugins: [rehypeHighlight],
      /* 必须：编译进 useMDXComponents，MDXProvider 的 docsMdxComponents 才会作用于标题/表格/代码块等 */
      providerImportSource: '@mdx-js/react',
    }),
  ],
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
      input: {
        main: resolve(__dirname, 'index.html'),
        changelog: resolve(__dirname, 'changelog.html'),
      },
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
