import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const serverPort = process.env.PORT || env.PORT || "2567";
  return {
    root: "client",
    plugins: [react()],
    server: {
      host: "127.0.0.1",
      port: 5173,
      strictPort: true,
      allowedHosts: [".trycloudflare.com"],
      proxy: {
      "/api": { target: `http://127.0.0.1:${serverPort}`, changeOrigin: false },
        "/matchmake": {
          target: `http://127.0.0.1:${serverPort}`,
          changeOrigin: false,
        },
        "^/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+(?:\\?.*)?$": {
          target: `ws://127.0.0.1:${serverPort}`,
          changeOrigin: false,
          ws: true,
        },
      },
    },
    build: {
      outDir: "../dist/client",
      emptyOutDir: true,
    },
  };
});
