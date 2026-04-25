import path from "path";
import { fileURLToPath } from "url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  base: './', // <-- Fixes the blank page on GitHub Pages!
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
