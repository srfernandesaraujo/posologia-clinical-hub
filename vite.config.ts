import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // Calculadoras não dependem de rede para calcular — o objetivo aqui é só
    // deixar o app shell (já um bundle único, sem code-splitting por rota)
    // disponível offline após a primeira visita.
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "favicon-16.png", "favicon-32.png", "pwa-icon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Posologia Clinical Hub",
        short_name: "Posologia",
        description: "Calculadoras e simuladores clínicos interativos para profissionais e estudantes da saúde.",
        theme_color: "#19dcb5",
        background_color: "#0b0f1a",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,svg,ico,png}"],
        // Bundle único sem code-splitting por rota (~6 MB) passa do limite
        // padrão do Workbox (2 MiB); sobe a cota em vez de introduzir
        // lazy-loading agora, que é escopo maior e fora desta fase.
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname.endsWith(".supabase.co") && url.pathname.startsWith("/rest/v1/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-rest",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
