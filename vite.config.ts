import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  // บอก Vite ให้ไปหาไฟล์ .env ที่โฟลเดอร์ชั้นนอก (Root)
  envDir: path.resolve(import.meta.dirname),
  server: {
    port: 3000,
    host: true
  }
});
