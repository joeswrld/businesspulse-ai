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
        console.warn('NoteX: window.ethereum is already set and not configurable. Skipping wallet injection.');
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
      // Don't log this as an error since it's expected behavior
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
      'setupBridgeMessengerRelay is only supported in Content Scripts'
    ];

    const shouldFilter = walletErrors.some(error => message.includes(error));
    
    if (!shouldFilter) {
      originalConsoleError.apply(console, args);
    } else {
      // Log as info instead of error for wallet conflicts
      console.info('NoteX: Wallet extension conflict handled gracefully');
    }
  };

  // Override console.warn to filter out wallet-related warnings
  const originalConsoleWarn = console.warn;
  console.warn = function(...args) {
    const message = args.join(' ');
    
    // Filter out common wallet extension warnings
    const walletWarnings = [
      'Backpack couldn\'t override',
      'Failed to set window.ethereum'
    ];

    const shouldFilter = walletWarnings.some(warning => message.includes(warning));
    
    if (!shouldFilter) {
      originalConsoleWarn.apply(console, args);
    }
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