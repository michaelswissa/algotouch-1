
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
    // Optimize chunks and prevent dynamic import failures
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-components': [
            '@/components/ui/button',
            '@/components/ui/card',
            '@/components/ui/tabs',
            '@/components/ui/input'
          ],
          'auth': ['@/contexts/auth/AuthProvider', '@/hooks/useSecureAuth'],
          'pages': [
            '@/pages/Auth',
            '@/pages/Dashboard',
            '@/pages/IframeRedirect',
            '@/pages/Calendar'
          ],
          'supabase': ['@supabase/supabase-js', '@/lib/supabase-client']
        },
        // Prevent code-splitting for critical route components
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
