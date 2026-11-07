import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
export default defineConfig(({ command }) => ({
  base: "./",
  publicDir:
    command === "build"
      ? fileURLToPath(new URL("../output/web-public/", import.meta.url))
      : "public",
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
}));
