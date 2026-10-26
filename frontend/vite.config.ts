import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": "http://localhost:8080",
      "/ws": { target: "ws://localhost:8080", ws: true },
    },
  },
  esbuild: { keepNames: true },
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks: { react: ["react", "react-dom/client"] },
      },
    },
  },
});
