// PWA Install Prompt Component
// Shows a prompt to install the app for better offline experience

import React, { useState, useEffect } from 'react';
import './PWAInstallPrompt.css';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after a delay (don't be too aggressive)
      setTimeout(() => {
        setShowPrompt(true);
      }, 30000); // Show after 30 seconds
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      console.log('[PWA] App installed successfully');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    await deferredPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] User response: ${outcome}`);

    if (outcome === 'accepted') {
      setShowPrompt(false);
    }

    // Clear the deferred prompt
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Don't show again for this session
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  // Don't show if already installed or dismissed
  if (isInstalled || !showPrompt || sessionStorage.getItem('pwa-prompt-dismissed')) {
    return null;
  }

  return (
    <div className="pwa-install-prompt" role="dialog" aria-labelledby="pwa-prompt-title">
      <div className="pwa-install-content">
        <button
          className="pwa-dismiss-button"
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
        >
          ✕
        </button>

        <div className="pwa-icon">📱</div>

        <h2 id="pwa-prompt-title" className="pwa-title">
          Install Healthcare App
        </h2>

        <p className="pwa-description">
          Install our app for a better experience with offline access to your health data,
          medication reminders, and emergency alerts.
        </p>

        <div className="pwa-benefits">
          <div className="pwa-benefit">
            <span className="pwa-benefit-icon">✓</span>
            <span>Works offline</span>
          </div>
          <div className="pwa-benefit">
            <span className="pwa-benefit-icon">✓</span>
            <span>Faster loading</span>
          </div>
          <div className="pwa-benefit">
            <span className="pwa-benefit-icon">✓</span>
            <span>Home screen access</span>
          </div>
        </div>

        <button
          className="pwa-install-button"
          onClick={handleInstallClick}
          aria-label="Install app"
        >
          Install App
        </button>

        <button
          className="pwa-later-button"
          onClick={handleDismiss}
          aria-label="Maybe later"
        >
          Maybe Later
        </button>
      </div>
    </div>
  );
};
