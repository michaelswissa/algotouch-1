
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
          // Force React and ReactDOM to be in the same chunk to avoid initialization issues
          if (id.includes('node_modules/react') || 
              id.includes('react-dom') ||
              id.includes('scheduler') ||
              id.includes('@remix-run/router') ||
              id.includes('react-router')) {
            return 'vendor-react';
          }
          
          // Force ALL critical components to be in the main chunk
          if (id.includes('Auth.tsx') || 
              id.includes('auth/') || 
              id.includes('LoginForm') || 
              id.includes('SignupForm') ||
              id.includes('Dashboard.tsx') ||
              id.includes('dashboard/') ||
              id.includes('IframeRedirect.tsx') ||
              id.includes('subscription/') ||
              id.includes('payment/') ||
              id.includes('PaymentSuccess.tsx') ||
              id.includes('PaymentFailed.tsx') ||
              id.includes('calendar/') ||  // Include all calendar components in main bundle
              id.includes('Community.tsx') ||
              id.includes('courses/') ||
              id.includes('Courses.tsx') ||
              id.includes('CourseDetail.tsx') ||
              id.includes('CourseCard.tsx')) {
            return 'index';
          }
          
          // Group UI components to ensure they load together with React
          if (id.includes('/components/ui/')) {
            return 'vendor-react';
          }
          
          // Group other chunks by category
          if (id.includes('/pages/') && 
              !id.includes('Auth') && 
              !id.includes('Dashboard') && 
              !id.includes('IframeRedirect') && 
              !id.includes('Courses') && 
              !id.includes('CourseDetail') && 
              !id.includes('PaymentSuccess') && 
              !id.includes('PaymentFailed')) {
            return 'pages';
          }
        },
        // Prevent dynamic imports for critical paths
        inlineDynamicImports: true
      }
    },
    chunkSizeWarningLimit: 1000,
    // Add source maps in development for better debugging
    sourcemap: true,
    // Improve error handling in production
    reportCompressedSize: true,
  }
}));
