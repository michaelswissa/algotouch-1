
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register service worker
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch(error => {
        console.log('ServiceWorker registration failed: ', error);
      });
  });
}

// Mount app with pre-rendering optimization
const container = document.getElementById('root');

if (container) {
  const root = createRoot(container);
  
  // Defer non-critical renders
  setTimeout(() => {
    root.render(<App />);
  }, 0);
} else {
  console.error('Failed to find the root element');
}
