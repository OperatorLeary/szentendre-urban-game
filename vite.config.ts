import { defineConfig, splitVendorChunkPlugin } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react(), splitVendorChunkPlugin()],
  build: {
    target: "es2022",
    sourcemap: true,
    chunkSizeWarningLimit: 700
  },
  resolve: {
    alias: {
      "@": "/src"
    }
  }
});
