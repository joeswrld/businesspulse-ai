# Multi-Channel Feedback System

A complete feedback collection system that consolidates feedback from multiple entry points into a single Supabase table with real-time updates.

## Quick Start

1. Run the SQL schema in Supabase
2. Set environment variables
3. Update PROJECT_ID in feedback-api.js
4. Deploy the files to your project

## Files Included

- `feedback-schema.sql` - Database schema with RLS policies
- `feedback-api.js` - JavaScript API for all channels
- `feedback-dashboard.js` - Real-time dashboard logic
- `feedback-page.html` - Complete dashboard UI
- `implementation-examples.html` - Integration examples

## Key Features

- Multi-channel collection (widget, QR, email)
- Real-time updates via Supabase
- Channel filtering and search
- Responsive design
- Secure with RLS policies

## Usage

```javascript
import { submitFeedback } from './feedback-api.js';

// Submit feedback from any channel
const result = await submitFeedback({
  channel: 'widget',
  name: 'John Doe',
  email: 'john@example.com',
  message: 'Great product!'
});
```

## Dashboard

The dashboard automatically:
- Loads existing feedback
- Subscribes to real-time updates
- Filters by channel
- Provides search functionality
- Shows statistics

Built for production use with proper error handling and security.