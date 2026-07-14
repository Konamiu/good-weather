import { defineConfig } from 'vite'

export default defineConfig({
  // 显式空 postcss 配置：阻止向上层目录搜索（桌面根目录受 macOS 权限保护）
  css: { postcss: {} },
  server: { port: 5173, strictPort: true },
  build: { assetsInlineLimit: 0 },
})
