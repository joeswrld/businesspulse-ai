// Web3 Wallet Conflict Handler
// This script prevents conflicts between multiple wallet extensions

(function() {
  'use strict';

  // Store original ethereum object if it exists
  const originalEthereum = window.ethereum;

  // Function to safely set ethereum object
  function safeSetEthereum(ethereumObj) {
    try {
      // Check if ethereum is already defined and not configurable
      if (window.ethereum && !Object.getOwnPropertyDescriptor(window, 'ethereum').configurable) {
        return false;
      }

      // Try to define ethereum property safely
      Object.defineProperty(window, 'ethereum', {
        value: ethereumObj,
        writable: true,
        configurable: true,
        enumerable: true
      });

      return true;
    } catch (error) {
      // Silently handle ethereum setting errors
      return false;
    }
  }

  // Function to restore original ethereum if needed
  function restoreOriginalEthereum() {
    if (originalEthereum && !window.ethereum) {
      try {
        Object.defineProperty(window, 'ethereum', {
          value: originalEthereum,
          writable: true,
          configurable: true,
          enumerable: true
        });
      } catch (error) {
        // Silently handle restoration errors
      }
    }
  }

  // Override console.error to filter out wallet-related errors
  const originalConsoleError = console.error;
  console.error = function(...args) {
    const message = args.join(' ');
    
    // Filter out common wallet extension errors
    const walletErrors = [
      'Cannot redefine property: ethereum',
      'Failed to set window.ethereum',
      'Backpack couldn\'t override',
      'setupBridgeMessengerRelay is only supported in Content Scripts',
      'TypeError: Failed to fetch',
      'net::ERR_INTERNET_DISCONNECTED',
      'Failed to load resource'
    ];

    const shouldFilter = walletErrors.some(error => message.includes(error));
    
    if (!shouldFilter) {
      originalConsoleError.apply(console, args);
    }
    // Silently filter out wallet and network errors
  };

  // Override console.warn to filter out wallet-related warnings
  const originalConsoleWarn = console.warn;
  console.warn = function(...args) {
    const message = args.join(' ');
    
    // Filter out common wallet extension warnings
    const walletWarnings = [
      'Backpack couldn\'t override',
      'Failed to set window.ethereum',
      'Billing profiles table not available',
      'Transactions table not available',
      'Usage tracking table not available',
      'Failed to create billing profile via function'
    ];

    const shouldFilter = walletWarnings.some(warning => message.includes(warning));
    
    if (!shouldFilter) {
      originalConsoleWarn.apply(console, args);
    }
    // Silently filter out wallet and billing warnings
  };

  // Expose safe functions globally
  window.NoteXWalletHandler = {
    safeSetEthereum,
    restoreOriginalEthereum,
    originalEthereum
  };

  // Log that the handler is loaded
  console.log('NoteX: Wallet conflict handler loaded successfully');

})();