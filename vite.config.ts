
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
  // Completely disable code splitting
  build: {
    target: 'es2015',
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: undefined, // Disable manual chunks
        inlineDynamicImports: true // Force everything into a single bundle
      }
    },
    // Increase chunk size warning limit since we'll have a larger bundle
    chunkSizeWarningLimit: 5000,
  },
  // Improve dev experience with eager loading
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom', 
      '@tanstack/react-query',
      'lucide-react',
      'date-fns',
      'recharts'
    ],
  },
}));
