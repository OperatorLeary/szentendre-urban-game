import { defineConfig, splitVendorChunkPlugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";

const oneDayInSeconds = 60 * 60 * 24;
const thirtyDaysInSeconds = oneDayInSeconds * 30;

export default defineConfig({
  plugins: [
    react(),
    splitVendorChunkPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Szentendre City Quest",
        short_name: "City Quest",
        description: "Mobile-first location quest with GPS and QR validation.",
        theme_color: "#0a84ff",
        background_color: "#f3f7fb",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "osm-tile-cache",
              expiration: {
                maxEntries: 120,
                maxAgeSeconds: thirtyDaysInSeconds
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "google-font-cache",
              expiration: {
                maxEntries: 12,
                maxAgeSeconds: thirtyDaysInSeconds
              }
            }
          }
        ]
      }
    })
  ],
  build: {
    target: "es2022",
    sourcemap: true,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          leaflet: ["leaflet"],
          supabase: ["@supabase/supabase-js"]
        }
      }
    }
  },
  resolve: {
    alias: {
      "@": "/src"
    }
  }
});
