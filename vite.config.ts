
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
  build: {
    // Force inline critical modules
    assetsInlineLimit: 10000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Force Auth and Dashboard components to be in the main chunk
          if (id.includes('Auth.tsx') || 
              id.includes('auth/') || 
              id.includes('LoginForm') || 
              id.includes('SignupForm') ||
              id.includes('Dashboard.tsx') ||
              id.includes('dashboard/')) {
            return 'index';
          }
          
          // Group other chunks by category
          if (id.includes('node_modules/react') || id.includes('react-dom') || id.includes('react-router-dom')) {
            return 'react-vendor';
          }
          if (id.includes('/components/ui/')) {
            return 'ui-components';
          }
          if (id.includes('/contexts/auth/') || id.includes('/hooks/useSecureAuth')) {
            return 'auth-core';
          }
          if (id.includes('/pages/') && !id.includes('Auth') && !id.includes('Dashboard')) {
            return 'pages';
          }
          if (id.includes('supabase')) {
            return 'supabase';
          }
        },
        // Don't inline dynamic imports by default, but we force auth and dashboard to be in main bundle
        inlineDynamicImports: false
      }
    },
    chunkSizeWarningLimit: 1000,
    // Add source maps in development for better debugging
    sourcemap: mode === 'development',
    // Improve error handling in production
    reportCompressedSize: true,
  }
}));
