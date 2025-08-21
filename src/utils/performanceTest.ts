import { supabase } from "@/integrations/supabase/client";
import { performanceMonitor } from "./performance";

// Performance test utilities
export const performanceTest = {
  // Test database connection speed
  async testConnection() {
    return performanceMonitor.measureAsync('Database Connection Test', async () => {
      const start = Date.now();
      const { data, error } = await supabase
        .from('feedback_settings')
        .select('count')
        .limit(1);
      
      const end = Date.now();
      return {
        duration: end - start,
        success: !error,
        error: error?.message
      };
    });
  },

  // Test query performance
  async testQuery(userId: string) {
    return performanceMonitor.measureAsync('Query Performance Test', async () => {
      const { data, error } = await supabase
        .from('feedback_settings')
        .select('project_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      return {
        success: !error,
        dataCount: data?.length || 0,
        error: error?.message
      };
    });
  },

  // Test network latency
  async testNetworkLatency() {
    return performanceMonitor.measureAsync('Network Latency Test', async () => {
      const start = Date.now();
      
      try {
        const response = await fetch('https://xjbrqeqizpoqdjkiyqzt.supabase.co/rest/v1/feedback_settings?select=count&limit=1', {
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqYnJxZXFpenBvcWRqa2l5cXp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNTAzMjcsImV4cCI6MjA3MDYyNjMyN30.cxMH9tUGYEOTUauzluSEeNyjG1iMtUZnNIj4QYGNi84',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqYnJxZXFpenBvcWRqa2l5cXp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNTAzMjcsImV4cCI6MjA3MDYyNjMyN30.cxMH9tUGYEOTUauzluSEeNyjG1iMtUZnNIj4QYGNi84'
          }
        });
        
        const end = Date.now();
        return {
          duration: end - start,
          success: response.ok,
          status: response.status
        };
      } catch (error) {
        const end = Date.now();
        return {
          duration: end - start,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
  },

  // Run comprehensive performance test
  async runFullTest(userId?: string) {
    console.log('🚀 Starting Performance Test Suite...');
    
    const results = {
      connection: await this.testConnection(),
      network: await this.testNetworkLatency(),
      query: userId ? await this.testQuery(userId) : null
    };

    console.log('📊 Performance Test Results:', results);
    
    // Analyze results
    const analysis = {
      connectionSlow: results.connection.duration > 1000,
      networkSlow: results.network.duration > 2000,
      querySlow: results.query && results.query.duration > 500,
      recommendations: [] as string[]
    };

    if (analysis.connectionSlow) {
      analysis.recommendations.push('Database connection is slow (>1s). Check Supabase region and connection pool.');
    }
    
    if (analysis.networkSlow) {
      analysis.recommendations.push('Network latency is high (>2s). Consider CDN or closer region.');
    }
    
    if (analysis.querySlow) {
      analysis.recommendations.push('Query performance is slow. Add database indexes.');
    }

    if (analysis.recommendations.length === 0) {
      analysis.recommendations.push('Performance looks good!');
    }

    console.log('💡 Recommendations:', analysis.recommendations);
    
    return { results, analysis };
  }
};

// Component performance monitoring
export const componentPerformance = {
  // Track component render times
  trackRender(componentName: string) {
    const start = performance.now();
    
    return {
      end: () => {
        const duration = performance.now() - start;
        console.log(`⚡ [COMPONENT] ${componentName} rendered in ${duration.toFixed(2)}ms`);
        return duration;
      }
    };
  },

  // Track async operations
  async trackAsync<T>(operationName: string, fn: () => Promise<T>): Promise<T> {
    return performanceMonitor.measureAsync(`Component: ${operationName}`, fn);
  }
};