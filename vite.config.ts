import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: "::",
    port: 8090,
    hmr: { overlay: false },
    proxy: {
      "/pollinations": {
        target: "https://image.pollinations.ai",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/pollinations/, ""),
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
});
