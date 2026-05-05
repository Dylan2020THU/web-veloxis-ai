import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// When deploying to https://<user>.github.io/<repo>/, every asset URL must be
// prefixed with /<repo>/. Override at build-time by setting VITE_BASE.
const base = process.env.VITE_BASE ?? "/web-veloxis-ai/";

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
