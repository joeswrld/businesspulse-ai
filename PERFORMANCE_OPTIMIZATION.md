# Performance Optimization Plan

## Current Performance Issues Identified

### 1. **Heavy Bundle Size**
- **Issue**: The build output shows chunks larger than 500KB (1.8MB main chunk)
- **Cause**: Large dependencies like Recharts, all Radix UI components, and heavy libraries
- **Impact**: Slow initial page load, especially on slower connections

### 2. **Sequential Database Calls**
- **Issue**: Multiple sequential database calls in Dashboard loading
- **Cause**: `checkAndSetupDatabase()` followed by `loadDashboardData()` with multiple separate queries
- **Impact**: Cumulative loading time adds up significantly

### 3. **Heavy Chart Components**
- **Issue**: Recharts library is loaded upfront even when not needed
- **Cause**: Direct imports in Dashboard component
- **Impact**: Large JavaScript bundle loaded on every page

### 4. **Inefficient Data Loading**
- **Issue**: Loading 50 feedbacks upfront and processing them client-side
- **Cause**: Fetching all data then filtering/processing in JavaScript
- **Impact**: Unnecessary data transfer and processing

### 5. **Auth Context Overhead**
- **Issue**: Multiple database calls in auth state change handler
- **Cause**: Checking and creating feedback_settings on every auth event
- **Impact**: Slows down authentication flow

## Optimization Solutions

### 1. **Code Splitting and Lazy Loading**

#### A. Route-based Code Splitting
```typescript
// App.tsx - Implement lazy loading
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Reports = lazy(() => import('./pages/Reports'));

// Wrap routes in Suspense
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Suspense fallback={<LoadingSpinner />}>
      <DashboardLayout>
        <Dashboard />
      </DashboardLayout>
    </Suspense>
  </ProtectedRoute>
} />
```

#### B. Component-based Code Splitting
```typescript
// Dashboard.tsx - Lazy load charts
const ChartComponents = lazy(() => import('./components/ChartComponents'));

// Only load charts when needed
{showCharts && (
  <Suspense fallback={<ChartSkeleton />}>
    <ChartComponents data={chartData} />
  </Suspense>
)}
```

### 2. **Database Query Optimization**

#### A. Combine Database Calls
```typescript
// Create a single optimized query
const loadDashboardDataOptimized = async (userId: string) => {
  const { data, error } = await supabase.rpc('get_dashboard_data', {
    user_id_param: userId,
    limit_param: 50
  });
  
  if (error) throw error;
  
  return {
    feedbacks: data.feedbacks || [],
    subscription: data.subscription,
    projectSettings: data.project_settings || []
  };
};
```

#### B. Database Function for Dashboard Data
```sql
-- Create optimized function
CREATE OR REPLACE FUNCTION get_dashboard_data(
  user_id_param UUID,
  limit_param INTEGER DEFAULT 50
)
RETURNS TABLE(
  feedbacks JSONB,
  subscription JSONB,
  project_settings JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT jsonb_agg(f.*) FROM (
      SELECT * FROM feedbacks f
      WHERE f.project_id IN (
        SELECT project_id FROM feedback_settings 
        WHERE user_id = user_id_param AND project_id IS NOT NULL
      )
      ORDER BY f.timestamp DESC
      LIMIT limit_param
    ) f) as feedbacks,
    
    (SELECT row_to_json(s.*) FROM user_subscriptions s
     WHERE s.user_id = user_id_param) as subscription,
    
    (SELECT jsonb_agg(ps.*) FROM (
      SELECT * FROM feedback_settings 
      WHERE user_id = user_id_param
    ) ps) as project_settings;
END;
$$;
```

### 3. **Chart Library Optimization**

#### A. Dynamic Import for Charts
```typescript
// Create separate chart components
// components/charts/FeedbackVolumeChart.tsx
import dynamic from 'next/dynamic';

const ResponsiveContainer = dynamic(
  () => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })),
  { ssr: false }
);

const AreaChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.AreaChart })),
  { ssr: false }
);
```

#### B. Chart Loading Strategy
```typescript
// Only load charts when in viewport
const [chartsInView, setChartsInView] = useState(false);

useEffect(() => {
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        setChartsInView(true);
        observer.disconnect();
      }
    },
    { threshold: 0.1 }
  );
  
  observer.observe(chartContainerRef.current);
  return () => observer.disconnect();
}, []);
```

### 4. **Auth Context Optimization**

#### A. Defer Non-Critical Operations
```typescript
// AuthContext.tsx - Defer feedback_settings creation
useEffect(() => {
  if (session?.user?.id && !seededSettingsFor) {
    // Defer this operation
    setTimeout(() => {
      ensureFeedbackSettings(session.user.id);
    }, 1000);
  }
}, [session?.user?.id, seededSettingsFor]);
```

#### B. Optimize Auth State Change Handler
```typescript
// Remove database calls from auth state change
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  (event, session) => {
    if (mounted) {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      setError(null);
    }
    // Remove database operations from here
  }
);
```

### 5. **Data Processing Optimization**

#### A. Server-side Processing
```sql
-- Create function for sentiment analysis
CREATE OR REPLACE FUNCTION analyze_feedback_sentiment(message_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  -- Implement sentiment analysis in SQL
  -- This reduces client-side processing
  RETURN CASE 
    WHEN message_text ~* 'great|good|excellent|amazing|wonderful|fantastic|love|like|happy|satisfied' THEN 'positive'
    WHEN message_text ~* 'bad|terrible|awful|horrible|hate|dislike|angry|frustrated|annoyed|disappointed' THEN 'negative'
    ELSE 'neutral'
  END;
END;
$$;
```

#### B. Pagination and Virtual Scrolling
```typescript
// Implement pagination for feedback list
const [page, setPage] = useState(1);
const [hasMore, setHasMore] = useState(true);

const loadMoreFeedbacks = async () => {
  const { data, error } = await supabase
    .from('feedbacks')
    .select('*')
    .in('project_id', projectIds)
    .order('timestamp', { ascending: false })
    .range((page - 1) * 20, page * 20 - 1);
    
  if (data && data.length < 20) {
    setHasMore(false);
  }
  
  setFeedbacks(prev => [...prev, ...data]);
  setPage(prev => prev + 1);
};
```

### 6. **Bundle Size Reduction**

#### A. Tree Shaking
```typescript
// Optimize imports
import { BarChart, Bar, XAxis, YAxis } from 'recharts';
// Instead of: import * as Recharts from 'recharts';
```

#### B. External Dependencies
```html
<!-- index.html - Load heavy libraries from CDN -->
<script src="https://unpkg.com/recharts@2.15.4/umd/Recharts.min.js"></script>
```

### 7. **Caching Strategy**

#### A. React Query Implementation
```typescript
// Implement proper caching
const { data: feedbacks, isLoading } = useQuery({
  queryKey: ['feedbacks', user.id, dateRange],
  queryFn: () => loadFeedbacks(user.id, dateRange),
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
});
```

#### B. Local Storage Caching
```typescript
// Cache user preferences
const [userPreferences, setUserPreferences] = useState(() => {
  const cached = localStorage.getItem('userPreferences');
  return cached ? JSON.parse(cached) : defaultPreferences;
});
```

## Implementation Priority

### Phase 1 (High Impact, Low Effort)
1. **Code Splitting** - Implement lazy loading for routes
2. **Database Optimization** - Combine multiple queries into single calls
3. **Auth Context Optimization** - Remove blocking operations

### Phase 2 (Medium Impact, Medium Effort)
1. **Chart Optimization** - Dynamic imports and lazy loading
2. **Data Processing** - Move to server-side where possible
3. **Caching** - Implement React Query properly

### Phase 3 (Low Impact, High Effort)
1. **Bundle Size Reduction** - Tree shaking and CDN usage
2. **Advanced Caching** - Service workers and offline support
3. **Performance Monitoring** - Add metrics and monitoring

## Expected Performance Improvements

- **Initial Load Time**: 40-60% reduction
- **Dashboard Load Time**: 50-70% reduction
- **Bundle Size**: 30-50% reduction
- **Time to Interactive**: 40-60% improvement

## Monitoring and Metrics

### Key Metrics to Track
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Time to Interactive (TTI)
- Bundle size
- Database query count and duration

### Tools for Monitoring
- Lighthouse CI
- Web Vitals
- Supabase Analytics
- Custom performance monitoring