import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;

          if (id.includes("gantt-task-react") || id.includes("react-kanban-kit")) {
            return "planner-vendor";
          }

          if (id.includes("@ant-design/icons")) return "antd-icons";
          if (id.includes("@ant-design")) return "antd-utils";
          if (id.includes("rc-") || id.includes("@rc-component")) return "antd-rc";
          if (id.includes("antd")) return "antd-core";

          if (
            id.includes("react") ||
            id.includes("react-dom") ||
            id.includes("react-router-dom") ||
            id.includes("scheduler")
          ) {
            return "react-vendor";
          }

          return "vendor";
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: false,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    },
  },
})
