#!/usr/bin/env node

/**
 * Backfill sentiment analysis for existing feedback entries
 * This script calls the backfill-sentiment edge function to analyze sentiment for existing feedback
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing required environment variables: SUPABASE_URL, SUPABASE_ANON_KEY');
  process.exit(1);
}

async function backfillSentiment(userId, batchSize = 10) {
  try {
    console.log(`Starting sentiment backfill for user: ${userId}`);
    console.log(`Batch size: ${batchSize}`);
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/backfill-sentiment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        user_id: userId,
        batch_size: batchSize
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Backfill completed successfully!');
      console.log(`📊 Processed: ${result.processed} feedback entries`);
      console.log(`✅ Updated: ${result.updated} feedback entries`);
      
      if (result.errors && result.errors.length > 0) {
        console.log('⚠️  Errors encountered:');
        result.errors.forEach(error => console.log(`   - ${error}`));
      }
    } else {
      console.error('❌ Backfill failed:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error running backfill:', error.message);
    process.exit(1);
  }
}

// Get user ID from command line arguments
const userId = process.argv[2];
const batchSize = parseInt(process.argv[3]) || 10;

if (!userId) {
  console.error('Usage: node backfill-sentiment.js <user_id> [batch_size]');
  console.error('Example: node backfill-sentiment.js 123e4567-e89b-12d3-a456-426614174000 20');
  process.exit(1);
}

backfillSentiment(userId, batchSize);