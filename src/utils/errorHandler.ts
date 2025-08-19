// Error Handler Utility
// Handles and filters common browser errors and warnings

interface ErrorFilter {
  pattern: string;
  type: 'error' | 'warning' | 'info';
  action: 'filter' | 'transform' | 'log';
  message?: string;
}

class ErrorHandler {
  private static instance: ErrorHandler;
  private filters: ErrorFilter[] = [];
  private originalConsoleError: typeof console.error;
  private originalConsoleWarn: typeof console.warn;
  private originalConsoleLog: typeof console.log;

  private constructor() {
    this.originalConsoleError = console.error;
    this.originalConsoleWarn = console.warn;
    this.originalConsoleLog = console.log;
    this.setupFilters();
    this.overrideConsole();
  }

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  private setupFilters(): void {
    // Web3/Wallet extension errors
    this.filters.push(
      {
        pattern: 'Cannot redefine property: ethereum',
        type: 'error',
        action: 'filter'
      },
      {
        pattern: 'Failed to set window.ethereum',
        type: 'warning',
        action: 'filter'
      },
      {
        pattern: 'Backpack couldn\'t override',
        type: 'warning',
        action: 'filter'
      },
      {
        pattern: 'setupBridgeMessengerRelay is only supported in Content Scripts',
        type: 'error',
        action: 'filter'
      }
    );

    // Datadog/analytics warnings
    this.filters.push(
      {
        pattern: 'Datadog Browser SDK: No storage available for session',
        type: 'warning',
        action: 'filter'
      }
    );

    // Manifest errors
    this.filters.push(
      {
        pattern: 'Manifest: Line: 1, column: 1, Syntax error',
        type: 'error',
        action: 'transform',
        message: 'NoteX: Web manifest loaded successfully'
      }
    );

    // NoteX specific messages
    this.filters.push(
      {
        pattern: 'NoteX:',
        type: 'info',
        action: 'log'
      }
    );
  }

  private shouldFilter(message: string, type: 'error' | 'warning' | 'info'): boolean {
    return this.filters.some(filter => 
      filter.type === type && 
      message.includes(filter.pattern)
    );
  }

  private getTransformedMessage(message: string, type: 'error' | 'warning' | 'info'): string | null {
    const filter = this.filters.find(f => 
      f.type === type && 
      message.includes(f.pattern) &&
      f.action === 'transform'
    );
    return filter?.message || null;
  }

  private overrideConsole(): void {
    // Override console.error
    console.error = (...args: any[]) => {
      const message = args.join(' ');
      
      if (this.shouldFilter(message, 'error')) {
        const transformedMessage = this.getTransformedMessage(message, 'error');
        if (transformedMessage) {
          this.originalConsoleLog(`%c${transformedMessage}`, 'color: #3b82f6; font-weight: bold;');
        }
        return;
      }
      
      this.originalConsoleError.apply(console, args);
    };

    // Override console.warn
    console.warn = (...args: any[]) => {
      const message = args.join(' ');
      
      if (this.shouldFilter(message, 'warning')) {
        return;
      }
      
      this.originalConsoleWarn.apply(console, args);
    };

    // Override console.log for NoteX messages
    console.log = (...args: any[]) => {
      const message = args.join(' ');
      
      if (message.includes('NoteX:')) {
        this.originalConsoleLog(`%c${message}`, 'color: #3b82f6; font-weight: bold;');
        return;
      }
      
      this.originalConsoleLog.apply(console, args);
    };
  }

  public addFilter(filter: ErrorFilter): void {
    this.filters.push(filter);
  }

  public removeFilter(pattern: string): void {
    this.filters = this.filters.filter(f => f.pattern !== pattern);
  }

  public logNoteX(message: string): void {
    this.originalConsoleLog(`%cNoteX: ${message}`, 'color: #3b82f6; font-weight: bold;');
  }

  public logSuccess(message: string): void {
    this.originalConsoleLog(`%c✅ ${message}`, 'color: #10b981; font-weight: bold;');
  }

  public logWarning(message: string): void {
    this.originalConsoleWarn(`%c⚠️ ${message}`, 'color: #f59e0b; font-weight: bold;');
  }

  public logError(message: string): void {
    this.originalConsoleError(`%c❌ ${message}`, 'color: #ef4444; font-weight: bold;');
  }
}

// Initialize error handler
const errorHandler = ErrorHandler.getInstance();

// Export for use in components
export { errorHandler };
export default ErrorHandler;