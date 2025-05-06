
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Optimize build settings
  build: {
    target: 'es2015',
    minify: 'terser',
    // Disable code splitting for problematic modules
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Create only two chunks: vendor and app
          if (id.includes('node_modules')) {
            return 'vendor';
          }
          return 'app';
        }
      }
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 2000,
  },
  // Improve dev experience
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
  },
}));
