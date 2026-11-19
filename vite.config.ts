import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [],
  server: {
    open: true,
  },
  build: {
    outDir: "dist",
    // Lightning CSS currently rewrites Calcite's light-dark() tokens incorrectly.
    cssMinify: "esbuild",
  },
});
