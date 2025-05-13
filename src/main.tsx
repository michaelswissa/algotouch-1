
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializeErrorHandler } from './lib/errorHandler';
import { 
  prefetchCriticalModules, 
  handleModuleLoadError 
} from './lib/moduleLoader';
import { 
  registerServiceWorker, 
  setupServiceWorkerUpdates,
  setupPeriodicUpdateChecks
} from './lib/serviceWorkerManager';
import { ThemeProvider } from 'next-themes';

// Initialize global error handler
initializeErrorHandler();

// Cache buster timestamp for all dynamic imports
window.__VITE_TIMESTAMP__ = Date.now();

// Setup service worker if supported
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      await registerServiceWorker();
      setupServiceWorkerUpdates();
    } catch (error) {
      console.error('Service worker setup failed:', error);
    }
  });
}

// Add global catch for uncaught module loading errors
window.addEventListener('error', (event) => {
  handleModuleLoadError(event);
});

// Create root once and render the app
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found. Check the index.html file.");
}

// Use the next-themes ThemeProvider with dark mode as default
const root = createRoot(rootElement);
root.render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
      <App />
    </ThemeProvider>
  </StrictMode>
);

// Prefetch critical modules
prefetchCriticalModules();

// Setup periodic update checks
setupPeriodicUpdateChecks();

// Add TypeScript declaration for window object
declare global {
  interface Window {
    __VITE_TIMESTAMP__: number;
  }
}
