
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Use relative paths for better compatibility with various hosting environments
  base: "./",
  
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
        // Use consistent filenames without hashes for better caching and debugging
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
        manualChunks: (id) => {
          // Force ALL critical components to be in the main chunk
          if (id.includes('Auth.tsx') || 
              id.includes('auth/') || 
              id.includes('LoginForm') || 
              id.includes('SignupForm') ||
              id.includes('Dashboard.tsx') ||
              id.includes('dashboard/') ||
              id.includes('IframeRedirect.tsx') ||
              id.includes('subscription/')) {
            return 'index';
          }
          
          // Group other chunks by category
          if (id.includes('node_modules/react') || id.includes('react-dom') || id.includes('react-router-dom')) {
            return 'vendor-react';
          }
          if (id.includes('/components/ui/')) {
            return 'ui-components';
          }
          if (id.includes('/pages/') && !id.includes('Auth') && !id.includes('Dashboard') && !id.includes('IframeRedirect')) {
            return 'pages';
          }
        },
        // Force inlining of dynamic imports for critical paths
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
