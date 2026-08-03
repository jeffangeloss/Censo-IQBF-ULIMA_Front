/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  test: {
    // La cola vive en IndexedDB; fake-indexeddb la da sin navegador.
    environment: "node",
    setupFiles: ["./tests/entorno.ts"],
    include: ["tests/**/*.test.ts"],
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    // La camara del celular exige HTTPS o localhost. En desarrollo se entra
    // por localhost; en el laboratorio, por la URL de la nube.
    port: 5174,
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL ?? "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});
