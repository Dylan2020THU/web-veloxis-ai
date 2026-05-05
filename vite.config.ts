import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Custom domain (www.veloxisai.com) serves the site from the root path, so
// base is "/". If you ever go back to https://<user>.github.io/<repo>/, set
//   $env:VITE_BASE = "/web-veloxis-ai/"
// before running `npm run deploy`.
const base = process.env.VITE_BASE ?? "/";

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
