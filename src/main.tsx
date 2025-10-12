// src/main.tsx
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Initialize error handler early to catch all console errors
import { errorHandler } from './utils/errorHandler';

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

createRoot(document.getElementById('root')!).render(
  <App />
);
