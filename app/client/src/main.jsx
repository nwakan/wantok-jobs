import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Render React app
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registered:', registration.scope);
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failed:', error);
      });
  });
}

// Listen for PWA install prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('💾 PWA install prompt available');
  // Prevent the default browser install prompt
  e.preventDefault();
  // Store the event for later use
  deferredPrompt = e;
  // Dispatch custom event to notify app that install is available
  window.dispatchEvent(new CustomEvent('pwa-install-available'));
});

// Listen for successful PWA installation
window.addEventListener('appinstalled', (e) => {
  console.log('✅ PWA installed successfully');
  deferredPrompt = null;
});

// Export function to trigger install prompt (for use in components)
window.showPWAInstallPrompt = async () => {
  if (!deferredPrompt) {
    console.warn('⚠️ PWA install prompt not available');
    return false;
  }
  
  // Show the install prompt
  deferredPrompt.prompt();
  
  // Wait for user response
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`PWA install prompt outcome: ${outcome}`);
  
  // Clear the deferred prompt
  deferredPrompt = null;
  
  return outcome === 'accepted';
};
