# Sentiment Analysis for Feedback System

This document describes the implementation of sentiment analysis for the feedback system using Google's Gemini API.

## Overview

The sentiment analysis feature automatically analyzes feedback messages and categorizes them as:
- **Positive**: Praise, satisfaction, compliments, or positive experiences
- **Negative**: Complaints, criticism, dissatisfaction, or negative experiences  
- **Neutral**: Factual statements, questions, suggestions, or mixed/unclear sentiment

## Implementation Details

### 1. Database Schema Updates

Added a `sentiment` column to the `feedbacks` table:

```sql
ALTER TABLE feedbacks 
ADD COLUMN IF NOT EXISTS sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral'));

CREATE INDEX IF NOT EXISTS idx_feedbacks_sentiment ON feedbacks(sentiment);

UPDATE feedbacks 
SET sentiment = 'neutral' 
WHERE sentiment IS NULL;
```

### 2. Backend Function Updates

#### Updated `create-feedback` Function

The `create-feedback` edge function now includes sentiment analysis:

- **Gemini API Integration**: Uses Google's Gemini 1.5 Flash model for sentiment analysis
- **Fallback Mechanism**: Defaults to 'neutral' if analysis fails
- **Error Handling**: Gracefully handles API failures without breaking feedback creation
- **Performance**: Optimized with low temperature and minimal token usage

#### New `backfill-sentiment` Function

A new edge function to analyze sentiment for existing feedback:

- **Batch Processing**: Processes feedback in configurable batches
- **User-Specific**: Only processes feedback for the requesting user's projects
- **Error Recovery**: Continues processing even if individual entries fail
- **Progress Tracking**: Returns detailed results about processed and updated entries

### 3. Frontend Updates

#### Feedback Page (`/feedback`)

- **Real-time Updates**: Uses Supabase Realtime subscriptions to update sentiment data
- **Sentiment Statistics**: Displays counts and percentages for each sentiment type
- **Visual Indicators**: Color-coded sentiment badges for each feedback entry
- **Filtering**: Filter feedback by sentiment type

#### Dashboard (`/dashboard`)

- **Comprehensive Metrics**: Shows total, positive, negative, and neutral feedback counts
- **Percentage Breakdown**: Displays sentiment distribution as percentages
- **Real-time Updates**: Automatically refreshes when new feedback is received
- **Visual Charts**: Sentiment breakdown in pie charts and other visualizations

### 4. Real-time Subscriptions

Both the Feedback page and Dashboard use Supabase Realtime subscriptions to automatically update when:

- New feedback is submitted
- Existing feedback is updated
- Sentiment analysis is completed

## Usage

### For New Feedback

Sentiment analysis happens automatically when feedback is submitted through the widget or API. No additional configuration is required.

### For Existing Feedback

Use the backfill script to analyze sentiment for existing feedback entries:

```bash
# Set environment variables
export SUPABASE_URL="your-supabase-url"
export SUPABASE_ANON_KEY="your-supabase-anon-key"

# Run backfill for a specific user
node backfill-sentiment.js <user_id> [batch_size]

# Example
node backfill-sentiment.js 123e4567-e89b-12d3-a456-426614174000 20
```

### API Usage

#### Create Feedback with Sentiment Analysis

```javascript
const response = await fetch('/functions/v1/create-feedback', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    project_id: 'your-project-id',
    message: 'This is great feedback!',
    email: 'user@example.com'
  })
});
```

#### Backfill Sentiment Analysis

```javascript
const response = await fetch('/functions/v1/backfill-sentiment', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    user_id: 'user-id',
    batch_size: 10
  })
});
```

## Configuration

### Environment Variables

The following environment variables are required:

- `GEMINI_API_KEY`: Google Gemini API key for sentiment analysis
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key

### Gemini API Configuration

The sentiment analysis uses the following Gemini API settings:

- **Model**: `gemini-1.5-flash-latest`
- **Temperature**: 0.1 (low for consistent results)
- **Top-K**: 1 (most likely response)
- **Top-P**: 0.1 (focused responses)
- **Max Output Tokens**: 10 (minimal response)

## Error Handling

### API Failures

- If Gemini API is unavailable, sentiment defaults to 'neutral'
- Feedback creation continues even if sentiment analysis fails
- Errors are logged for monitoring and debugging

### Database Errors

- Sentiment column has a CHECK constraint to ensure valid values
- Existing NULL sentiment values are updated to 'neutral'
- Database indexes improve query performance

### Real-time Subscription Errors

- Subscriptions automatically reconnect on connection loss
- Error handling prevents UI crashes from subscription failures
- Console logging helps with debugging subscription issues

## Performance Considerations

### Batch Processing

- Backfill function processes feedback in configurable batches
- Default batch size is 10 to balance performance and API limits
- Larger batches can be used for bulk processing

### Caching

- Sentiment analysis results are stored in the database
- No re-analysis of existing feedback unless explicitly requested
- Real-time subscriptions only trigger on actual changes

### API Limits

- Gemini API has rate limits and usage quotas
- Batch processing helps manage API usage
- Error handling prevents excessive API calls on failures

## Monitoring

### Logs

The following events are logged:

- Sentiment analysis requests and results
- API failures and fallback usage
- Real-time subscription events
- Backfill processing progress

### Metrics

Track these metrics for monitoring:

- Sentiment analysis success rate
- API response times
- Real-time subscription health
- Feedback processing throughput

## Troubleshooting

### Common Issues

1. **Sentiment always returns 'neutral'**
   - Check if `GEMINI_API_KEY` is set correctly
   - Verify API key has proper permissions
   - Check API quota and rate limits

2. **Real-time updates not working**
   - Ensure Supabase Realtime is enabled
   - Check network connectivity
   - Verify subscription filters are correct

3. **Backfill script fails**
   - Verify user ID exists and has feedback
   - Check database permissions
   - Ensure edge function is deployed

### Debug Mode

Enable debug logging by checking browser console and server logs for:

- Sentiment analysis API calls and responses
- Real-time subscription events
- Database query results
- Error messages and stack traces

## Future Enhancements

### Potential Improvements

1. **Confidence Scores**: Add confidence levels to sentiment analysis
2. **Custom Models**: Train custom sentiment models for specific domains
3. **Multi-language Support**: Analyze sentiment in different languages
4. **Emotion Detection**: Identify specific emotions beyond positive/negative/neutral
5. **Trend Analysis**: Track sentiment trends over time
6. **Automated Actions**: Trigger actions based on sentiment (e.g., alerts for negative feedback)

### API Optimizations

1. **Batch Analysis**: Analyze multiple messages in a single API call
2. **Caching**: Cache analysis results for similar messages
3. **Async Processing**: Process sentiment analysis asynchronously
4. **Rate Limiting**: Implement client-side rate limiting

## Security Considerations

### Data Privacy

- Feedback messages are sent to Google's Gemini API
- Ensure compliance with data privacy regulations
- Consider data residency requirements

### API Security

- Use environment variables for API keys
- Implement proper authentication and authorization
- Monitor API usage for unusual patterns

### Database Security

- Sentiment column has proper constraints
- Row Level Security (RLS) policies apply to sentiment data
- Regular security audits of database access