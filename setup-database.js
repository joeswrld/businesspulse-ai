const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = 'https://xjbrqeqizpoqdjkiyqzt.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'your-service-key-here';

// Create Supabase client with service key for admin operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Basic database setup SQL (removed feedback system)
const setupSQL = `
-- Basic Database Setup
-- Run this script in your Supabase SQL Editor

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
`;

async function setupDatabase() {
  try {
    console.log('Setting up basic database...');
    
    // Execute the SQL script
    const { error } = await supabase.rpc('exec_sql', { sql: setupSQL });
    
    if (error) {
      console.error('Error setting up database:', error);
      console.log('\nManual Setup Instructions:');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Run the basic setup SQL');
      return;
    }
    
    console.log('✅ Database setup completed successfully!');
    
  } catch (error) {
    console.error('Failed to setup database:', error);
    console.log('\nManual Setup Instructions:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run the basic setup SQL');
  }
}

// Run the setup
setupDatabase();