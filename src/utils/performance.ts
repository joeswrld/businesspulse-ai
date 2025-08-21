// Performance monitoring utility
export const performanceMonitor = {
  start: (label: string) => {
    const startTime = performance.now();
    console.log(`🚀 [PERF] Starting: ${label}`);
    return {
      end: () => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        console.log(`⏱️ [PERF] ${label}: ${duration.toFixed(2)}ms`);
        return duration;
      }
    };
  },

  async measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const timer = performanceMonitor.start(label);
    try {
      const result = await fn();
      timer.end();
      return result;
    } catch (error) {
      timer.end();
      throw error;
    }
  }
};

// Database query performance monitoring
export const dbPerformance = {
  async query<T>(label: string, queryFn: () => Promise<T>): Promise<T> {
    return performanceMonitor.measureAsync(`DB Query: ${label}`, queryFn);
  }
};