# NoteX Real-Time AI Insights Workflow

## Overview

This document describes the implementation of the real-time AI insights generation workflow for NoteX. The system automatically processes uploaded data through Gemini AI to generate actionable business insights in real-time.

## Architecture

### Data Flow

```
User Upload → Supabase Storage → Edge Function → Gemini AI → ai_insights Table → Real-time UI Updates
```

### Components

1. **Data Upload Page** (`src/pages/DataUpload.tsx`)
   - Handles file uploads (CSV, PDF, DOCX, TXT) and text input
   - Creates data source records in Supabase
   - Triggers AI processing via Edge Function

2. **Edge Function** (`supabase/functions/process-upload-to-insights/index.ts`)
   - Processes uploaded data
   - Calls Gemini AI for insights generation
   - Stores structured insights in database
   - Updates processing status

3. **AI Insights Page** (`src/pages/AIInsights.tsx`)
   - Displays real-time insights
   - Provides filtering and search
   - Shows metrics and statistics
   - Supports bookmarking and feedback

4. **Custom Hook** (`src/hooks/useAIInsights.ts`)
   - Manages real-time data subscription
   - Provides filtering and statistics
   - Handles user interactions (bookmark, feedback, action plans)

## Database Schema

### ai_insights Table

```sql
CREATE TABLE ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_source_id UUID REFERENCES data_sources(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT CHECK (category IN ('Customer Experience', 'Revenue', 'Operations', 'Growth', ...)),
  priority TEXT CHECK (priority IN ('High', 'Medium', 'Low', 'high', 'medium', 'low')),
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  summary TEXT,
  key_findings TEXT[],
  recommendations TEXT[],
  projected_impact TEXT,
  tags TEXT[],
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Supporting Tables

- `ai_insights_feedback` - User feedback on insights
- `action_plans` - Action plans created from insights
- `data_sources` - Source data files and metadata

## Real-Time Features

### 1. Automatic Insight Generation

Every upload automatically triggers:
- Content extraction and normalization
- Semantic chunking for AI processing
- Gemini AI analysis with structured prompts
- Database storage with real-time updates

### 2. Live Metrics Updates

The AI Insights page displays real-time metrics:
- Total Insights count
- High Priority insights count
- Average confidence score
- Bookmarked insights count

### 3. Real-Time UI Updates

Using Supabase Realtime:
- New insights appear instantly
- Metrics update automatically
- No page refresh required
- Cross-tab synchronization

## Gemini AI Integration

### Prompt Structure

```typescript
const prompt = `
  Task: Generate actionable business insights
  Data: ${chunks.join('\n\n')}
  Context:
    Categories: Customer Experience, Revenue, Operations, Growth
    Goals: Reduce churn, Increase MRR, Improve efficiency, Expand markets
  Output schema: JSON with title, category, priority, confidence, summary, key_findings[], recommendations[], projected_impact, tags[], source, created_at
`;
```

### Expected Output Format

```json
{
  "title": "Customer Retention Risk Alert",
  "category": "Customer Experience",
  "priority": "High",
  "confidence": 85,
  "summary": "Analysis shows 23% of customers are at risk of churning within 30 days.",
  "key_findings": [
    "Customer engagement dropped 45% in last month",
    "Support response time increased to 2.3 days"
  ],
  "recommendations": [
    "Launch proactive customer outreach campaign",
    "Reduce support response time by 50%"
  ],
  "projected_impact": "Reduce churn by 15% and increase customer lifetime value by $2,400 per retained customer",
  "tags": ["customer-retention", "churn-risk", "engagement"],
  "source": "customer_feedback.csv",
  "created_at": "2024-01-15T10:30:00Z"
}
```

## User Interactions

### 1. Bookmarking Insights

Users can bookmark important insights:
- Click bookmark icon on insight card
- Updates in real-time across all tabs
- Filter by bookmarked insights

### 2. Feedback System

Users can provide feedback:
- Thumbs up/down on insights
- Stored in `ai_insights_feedback` table
- Used for AI model improvement

### 3. Action Plans

Users can create action plans:
- Convert insights into actionable tasks
- Set priorities and due dates
- Track implementation progress

## File Processing

### Supported Formats

- **CSV**: Parsed as structured data
- **PDF**: Text extraction (basic)
- **DOCX**: Text extraction (basic)
- **TXT**: Direct text processing
- **Text Input**: Direct processing

### Processing Pipeline

1. **Upload**: File stored in Supabase Storage
2. **Extraction**: Content extracted based on file type
3. **Normalization**: Text cleaned and normalized
4. **Chunking**: Content split into semantic chunks
5. **AI Analysis**: Gemini processes chunks
6. **Storage**: Insights stored in database
7. **Real-time Update**: UI updates automatically

## Error Handling

### Graceful Degradation

- If Gemini API fails, fallback insights are generated
- Processing errors are logged and displayed
- Upload status is updated appropriately
- Users are notified of issues

### Retry Logic

- Failed uploads can be retried
- Edge Function includes error recovery
- Database transactions ensure consistency

## Performance Considerations

### Optimization Strategies

- Content chunking for large files
- Efficient database queries with indexes
- Real-time subscriptions with proper cleanup
- Caching of frequently accessed data

### Scalability

- Edge Functions handle processing load
- Database indexes for fast queries
- Real-time subscriptions scale with users
- File storage in Supabase Storage

## Security

### Data Protection

- Row Level Security (RLS) on all tables
- User-specific data isolation
- Secure API key management
- Input validation and sanitization

### Access Control

- Users can only access their own insights
- File uploads are user-scoped
- API endpoints require authentication
- Real-time subscriptions are filtered by user

## Monitoring and Analytics

### Metrics Tracked

- Upload success/failure rates
- AI processing times
- User engagement with insights
- Feedback patterns

### Logging

- Edge Function execution logs
- Database operation logs
- Real-time subscription events
- Error tracking and alerting

## Future Enhancements

### Planned Features

1. **Advanced File Processing**
   - Better PDF/DOCX parsing
   - Image content analysis
   - Multi-language support

2. **Enhanced AI Capabilities**
   - Custom model fine-tuning
   - Industry-specific insights
   - Predictive analytics

3. **Collaboration Features**
   - Team insights sharing
   - Comment and discussion threads
   - Insight approval workflows

4. **Advanced Analytics**
   - Insight trend analysis
   - Impact measurement
   - ROI calculations

## Deployment

### Environment Variables

```bash
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_api_key
```

### Edge Function Deployment

```bash
supabase functions deploy process-upload-to-insights
```

### Database Migration

```bash
supabase db push
```

## Troubleshooting

### Common Issues

1. **Insights not generating**
   - Check Gemini API key configuration
   - Verify file content extraction
   - Review Edge Function logs

2. **Real-time updates not working**
   - Ensure RLS policies are correct
   - Check realtime publication settings
   - Verify user authentication

3. **Performance issues**
   - Monitor database query performance
   - Check file size limits
   - Review Edge Function timeout settings

### Debug Tools

- Supabase Dashboard for database monitoring
- Edge Function logs in Supabase Dashboard
- Browser developer tools for real-time debugging
- Network tab for API call monitoring

## Conclusion

The real-time AI insights workflow provides a seamless experience for users to upload data and receive actionable insights instantly. The system is designed to be scalable, secure, and user-friendly while leveraging the power of Gemini AI for intelligent analysis.