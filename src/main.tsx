// src/main.tsx
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Initialize error handler early to catch all console errors
import { errorHandler } from './utils/errorHandler';

// UI components for banner
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

// Hooks
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';

// Silence browser extension errors (MetaMask, etc.)
if (typeof window !== 'undefined') {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    const message = args.join(' ');
    if (
      message.includes('Failed to set window.ethereum') ||
      message.includes('window.ethereum') ||
      message.includes('MetaMask') ||
      message.includes('Web3') ||
      message.includes('wallet') ||
      message.includes('extension')
    ) {
      console.debug('Browser extension error (filtered):', ...args);
      return;
    }
    originalConsoleError.apply(console, args);
  };

  if (window.ethereum === undefined) {
    console.debug("No web3 provider found, skipping ethereum injection...");
  }
}

// Log application startup
errorHandler.logNoteX('Application starting...');

// Small wrapper to inject the banner above <App />
function MainWithBanner() {
  const navigate = useNavigate();
  const { status, daysLeft } = useSubscriptionStatus({ redirectOnExpiry: false });

  return (
    <>
      {status === 'trial' && daysLeft <= 3 && daysLeft > 0 && (
        <Alert className="border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20">
          <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <AlertDescription className="text-orange-900 dark:text-orange-100 flex items-center">
            Trial ending in {daysLeft} day{daysLeft !== 1 ? 's' : ''}. Upgrade to keep your features.
            <Button
              onClick={() => navigate('/billing')}
              size="sm"
              variant="link"
              className="ml-2 text-orange-600 dark:text-orange-400 p-0 h-auto"
            >
              Upgrade →
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <App />
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <MainWithBanner />
  </BrowserRouter>
);
