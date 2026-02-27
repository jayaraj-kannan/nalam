import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import * as serviceWorkerRegistration from './utils/serviceWorkerRegistration';
import { initWebVitals } from './utils/webVitals';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Initialize Web Vitals monitoring for performance tracking
// Requirements: 5.1 - Monitor elderly-friendly interface performance
initWebVitals();

// Register service worker for offline functionality
serviceWorkerRegistration.register({
  onSuccess: () => {
    console.log('App is ready for offline use');
  },
  onUpdate: (registration) => {
    console.log('New version available! Please refresh.');
    // Optionally show a notification to the user
    if (confirm('A new version is available. Refresh now?')) {
      window.location.reload();
    }
  },
  onOffline: () => {
    console.log('App is running in offline mode');
  },
  onOnline: () => {
    console.log('App is back online');
  },
});

// Request persistent storage for critical health data
serviceWorkerRegistration.requestPersistentStorage();
