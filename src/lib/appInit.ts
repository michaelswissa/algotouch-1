
/**
 * Application initialization and setup
 */

import { initializeErrorHandler } from './errorHandler';
import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { ThemeProvider } from 'next-themes';
import App from '../App';
import { 
  prefetchCriticalModules,
  setupModuleErrorHandlers,
  setupPeriodicUpdates
} from './serviceWorkerInit';

/**
 * Initialize the React application
 */
export function initializeApp(): void {
  // Use a try-catch to handle any React initialization errors
  try {
    const rootElement = document.getElementById("root");
    if (!rootElement) {
      throw new Error("Root element not found. Check the index.html file.");
    }

    // Create root once and render the app
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <App />
        </ThemeProvider>
      </StrictMode>
    );
    
    // Prefetch critical modules
    prefetchCriticalModules();
    
    // Add global catch for uncaught module loading errors
    setupModuleErrorHandlers();

    // Setup periodic updates
    setupPeriodicUpdates();
  } catch (error) {
    console.error('Failed to initialize React application:', error);
    showFallbackUI();
  }
}

/**
 * Show fallback UI in case of critical errors
 */
function showFallbackUI(): void {
  document.body.innerHTML = `
    <div style="text-align:center;padding:2rem;">
      <h1>Application Error</h1>
      <p>Failed to initialize the application. Please try refreshing the page.</p>
      <button onclick="window.location.reload()">Refresh Now</button>
    </div>
  `;
}
