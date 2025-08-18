# Insights Page Setup Guide

This guide will help you set up the new simplified Insights page with realtime updates, sentiment analysis, and all the features you requested.

## 🗄 Database Setup

### 1. Create the Insights Table

Run the following SQL in your Supabase SQL Editor:

```sql
-- Create simple insights table for basic AI insights with sentiment analysis
CREATE TABLE IF NOT EXISTS insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  input_text TEXT NOT NULL,
  summary TEXT,
  sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_insights_user_id ON insights(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_sentiment ON insights(sentiment);
CREATE INDEX IF NOT EXISTS idx_insights_created_at ON insights(created_at DESC);

-- Enable Row Level Security
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for insights
CREATE POLICY "Users can view their own insights" ON insights
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own insights" ON insights
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own insights" ON insights
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own insights" ON insights
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_insights_updated_at
  BEFORE UPDATE ON insights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for insights table
ALTER TABLE insights REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE insights;
```

## ⚡ Edge Function Setup

### 2. Deploy the Generate Insight Function

1. Go to your Supabase Dashboard
2. Navigate to Edge Functions
3. Create a new function called `generate-insight`
4. Copy the code from `supabase/functions/generate-insight/index.ts`
5. Deploy the function

### 3. Set Environment Variables

In your Supabase Dashboard, go to Settings > Edge Functions and add:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

## 🎨 Frontend Setup

### 4. Access the New Insights Page

The new Insights page is available at `/insights-simple` and includes:

✅ **Realtime updates** (Supabase Realtime)  
✅ **Gemini AI summary + sentiment**  
✅ **Optimistic "Analyzing…" placeholder**  
✅ **Sentiment-based toast notifications**  
✅ **Filter dropdown** (All / Positive / Negative / Neutral)  
✅ **Search bar** (keyword filtering)  
✅ **Keyword highlighting**  
✅ **Clear search button**  

## 🚀 Features

### Realtime Updates
- When you submit text, it appears instantly with "⏳ Analyzing..."
- Gemini processes the text and updates the row
- UI updates automatically via Supabase Realtime
- Toast notifications show sentiment results

### Sentiment Analysis
- **Positive** → 🌞 Green toast + green sentiment badge
- **Negative** → ⚠️ Red toast + red sentiment badge  
- **Neutral** → 😐 Gray toast + gray sentiment badge

### Search & Filter
- **Search bar**: Type keywords to filter insights
- **Keyword highlighting**: Matched words are highlighted in yellow
- **Sentiment filter**: Filter by positive/negative/neutral
- **Clear search**: ❌ button to reset search

### Optimistic UI
- Submit → card appears immediately with "Analyzing..."
- No waiting for AI response
- Smooth user experience

## 🔧 How It Works

1. **User submits text** → Optimistic insert with `summary: null, sentiment: null`
2. **Edge Function called** → Sends text to Gemini AI
3. **Gemini responds** → Returns JSON with `summary` and `sentiment`
4. **Database updated** → Row updated with AI results
5. **Realtime triggers** → UI updates + toast notification
6. **User sees results** → Card shows summary + colored sentiment

## 🎯 Usage

1. Navigate to `/insights-simple`
2. Paste feedback or text in the textarea
3. Click "Generate Insight"
4. Watch the realtime magic happen!
5. Use search and filters to explore insights

## 🐛 Troubleshooting

### Table not found
- Run the SQL script in Supabase SQL Editor
- Check that RLS policies are created

### Edge Function errors
- Verify `GEMINI_API_KEY` is set in Supabase
- Check function logs in Supabase Dashboard

### Realtime not working
- Ensure table is added to realtime publication
- Check browser console for connection errors

### Toast notifications not showing
- Verify Sonner is imported and Toaster is in App.tsx
- Check that toast calls are working

## 📝 Example Usage

```typescript
// Submit feedback
const feedback = "The new dashboard is amazing! I love how fast it loads and the clean design.";

// Results in:
// Summary: "User expresses high satisfaction with the new dashboard's performance and design"
// Sentiment: "positive" (with green toast notification)
```

The Insights page is now fully functional with all the features you requested! 🎉