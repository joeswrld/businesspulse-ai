# Analytics Page - Business Intelligence Dashboard

## Overview

The Analytics page is a comprehensive business intelligence dashboard that provides real-time insights into your business performance using AI-powered analytics. It integrates seamlessly with your existing Insights, Dashboard, and Reports pages to deliver actionable business intelligence.

## Features

### 🚀 Real-Time KPIs and Metrics
- **Total Insights**: Count of AI-generated insights
- **Reports Generated**: Number of completed reports
- **Active AI Jobs**: Currently processing AI tasks
- **Team Members**: Collaboration team size
- **Growth Rate**: Performance trends over time
- **Data Sources**: Uploaded datasets count

### 📊 Interactive Charts and Visualizations
- **Sentiment Trends**: Line chart showing sentiment analysis over time
- **Key Themes**: Bar chart displaying most frequent insight categories
- **Reports Progress**: Area chart showing weekly report completion status
- **Priority Distribution**: Pie chart of insights by priority level

### 🤖 Gemini-Powered AI Analytics
- **Executive Summary**: AI-generated business intelligence overview
- **Top Themes**: Automated theme extraction and categorization
- **Recommended Actions**: AI-suggested business strategies
- **KPI Snapshot**: Comprehensive metrics dashboard
- **Trend Analysis**: Sentiment and activity trend identification

### ⚡ Real-Time Updates
- **Supabase Realtime**: Live updates for all data changes
- **Instant Refresh**: Automatic chart and metric updates
- **Live Subscriptions**: Real-time insights, reports, and job status

## Technical Architecture

### Frontend Components
- **React/TypeScript**: Modern, type-safe development
- **TailwindCSS**: Responsive, modern UI design
- **Recharts**: Professional data visualization library
- **Shadcn/ui**: Consistent component design system

### Backend Integration
- **Supabase**: Real-time database and authentication
- **Edge Functions**: Serverless AI analytics processing
- **Gemini AI**: Google's advanced language model for insights

### Data Flow
```
User Data → Supabase → Gemini AI → Analytics Dashboard → Real-time Updates
```

## Setup Instructions

### 1. Database Migration
Run the following migration to create the required `ai_jobs` table:

```bash
supabase db push
```

This will create:
- `ai_jobs` table for tracking AI processing jobs
- Proper indexes and RLS policies
- Realtime subscriptions

### 2. Edge Function Deployment
Deploy the `geminiAnalytics` Edge Function:

```bash
supabase functions deploy geminiAnalytics
```

### 3. Environment Variables
Ensure the following environment variables are set in your Supabase project:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. Frontend Dependencies
The required dependencies are already included in `package.json`:
- `@supabase/supabase-js` for database operations
- `recharts` for chart visualizations
- `lucide-react` for icons

## Usage Guide

### Accessing Analytics
1. Navigate to the Analytics page in your application
2. The page automatically loads your business data
3. All KPIs and charts update in real-time

### Generating AI Analytics
1. Click the **"Generate AI Analytics"** button
2. The system sends your data to Gemini AI for analysis
3. Results include:
   - Overall business sentiment
   - Key themes and patterns
   - Actionable recommendations
   - KPI snapshots

### Time Range Filtering
- **7 Days**: Last week's data
- **30 Days**: Monthly trends
- **90 Days**: Quarterly analysis

### Real-Time Features
- **Live Updates**: All data refreshes automatically
- **Instant Charts**: Visualizations update in real-time
- **Live KPIs**: Metrics update as new data arrives

## Data Sources

The Analytics page pulls data from:

| Table | Purpose | Real-time Updates |
|-------|---------|-------------------|
| `ai_insights` | AI-generated business insights | ✅ Yes |
| `reports` | Generated business reports | ✅ Yes |
| `data_sources` | Uploaded datasets | ✅ Yes |
| `ai_jobs` | AI processing tasks | ✅ Yes |
| `team_members` | Collaboration team | ✅ Yes |

## Chart Types and Data

### Sentiment Trends Line Chart
- **Data**: Daily sentiment analysis
- **Metrics**: Positive, Neutral, Negative insights
- **Calculation**: Based on priority and confidence scores

### Key Themes Bar Chart
- **Data**: Insight categories and frequencies
- **Metrics**: Theme count and percentages
- **Sorting**: Most frequent themes first

### Reports Progress Area Chart
- **Data**: Weekly report completion
- **Metrics**: Completed vs. In Progress
- **Grouping**: Weekly aggregation

### Priority Distribution Pie Chart
- **Data**: Insights by priority level
- **Metrics**: High, Medium, Low priority counts
- **Visualization**: Percentage-based distribution

## AI Analytics Features

### Gemini AI Integration
The system uses Google's Gemini AI to:
- Analyze business patterns
- Generate actionable insights
- Provide strategic recommendations
- Calculate business metrics

### AI-Generated Content
- **Executive Summary**: 2-3 sentence business overview
- **Top Themes**: 5 most important business categories
- **Recommended Actions**: 4 actionable business strategies
- **KPI Snapshot**: Comprehensive metrics dashboard

### Fallback Analytics
If Gemini AI is unavailable, the system provides:
- Default analytics based on data patterns
- Basic trend calculations
- Standard business recommendations

## Performance Features

### Real-Time Subscriptions
- **Insights**: Live updates for new insights
- **Reports**: Real-time report status changes
- **Data Sources**: Live upload notifications
- **AI Jobs**: Processing status updates
- **Team Members**: Collaboration changes

### Optimized Data Loading
- **Parallel Queries**: Multiple data sources fetched simultaneously
- **Efficient Processing**: Optimized chart data calculations
- **Smart Caching**: Database-level analytics caching
- **Lazy Loading**: Charts render on demand

## Customization Options

### Chart Colors
Modify the `COLORS` array in the component:
```typescript
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
```

### Time Ranges
Add custom time ranges in the `timeRange` state:
```typescript
<SelectItem value="custom">Custom Range</SelectItem>
```

### Additional Metrics
Extend the KPI cards by adding new metrics:
```typescript
// Add new metric calculation
const newMetric = calculateNewMetric(data);

// Add to metrics array
setMetrics(prev => [...prev, newMetric]);
```

## Troubleshooting

### Common Issues

#### Build Errors
- Ensure all dependencies are installed: `npm install`
- Check TypeScript compilation: `npm run build`
- Verify component imports and exports

#### Real-Time Issues
- Check Supabase connection status
- Verify RLS policies are properly configured
- Ensure tables are added to realtime publication

#### AI Analytics Failures
- Verify Gemini API key is set
- Check Edge Function deployment status
- Review function logs for errors

#### Chart Rendering Issues
- Ensure data is properly formatted
- Check for null/undefined values
- Verify chart component props

### Debug Mode
Enable debug logging by adding:
```typescript
console.log('Analytics Data:', { insights, reports, dataSources });
```

## Security Features

### Row Level Security (RLS)
- All data is filtered by `user_id`
- Users can only access their own data
- Secure API endpoints with authentication

### Data Privacy
- No user data is shared with third parties
- AI processing uses only your business data
- Secure Supabase authentication

## Future Enhancements

### Planned Features
- **Advanced Filtering**: Date range picker, category filters
- **Export Functionality**: PDF/Excel report generation
- **Custom Dashboards**: User-defined metric combinations
- **Alert System**: Automated business intelligence alerts
- **Integration APIs**: Connect with external business tools

### Performance Improvements
- **Virtual Scrolling**: Handle large datasets efficiently
- **Chart Optimization**: Lazy loading for complex visualizations
- **Caching Strategy**: Intelligent data caching
- **Bundle Splitting**: Code splitting for better performance

## Support and Maintenance

### Regular Maintenance
- **Database Optimization**: Regular index maintenance
- **Function Updates**: Keep Edge Functions current
- **Dependency Updates**: Regular package updates
- **Performance Monitoring**: Track page load times

### Monitoring
- **Error Tracking**: Monitor for runtime errors
- **Performance Metrics**: Track chart rendering times
- **User Analytics**: Monitor feature usage
- **API Response Times**: Track Edge Function performance

## Conclusion

The Analytics page provides a comprehensive, real-time business intelligence solution that integrates seamlessly with your existing system. With AI-powered insights, live data updates, and professional visualizations, it delivers actionable business intelligence to drive growth and optimization.

For additional support or feature requests, please refer to the main project documentation or contact the development team.