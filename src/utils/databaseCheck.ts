import { supabase } from '@/integrations/supabase/client';

export const checkAndSetupDatabase = async (userId: string) => {
  try {
    console.log('🔍 Checking database tables for user:', userId);
    
    // Check if feedback_settings table exists and user has a record
    try {
      const { data: feedbackSettings, error: feedbackError } = await supabase
        .from('feedback_settings')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (feedbackError) {
        console.log('❌ Feedback settings error:', feedbackError.message);
        // Try to create the table using the RPC function
        try {
          const { error: setupError } = await supabase.rpc('ensure_user_records_safe', {
            user_id_param: userId
          });
          
          if (setupError) {
            console.log('❌ Setup function error:', setupError.message);
          } else {
            console.log('✅ Database setup completed');
          }
        } catch (setupException) {
          console.log('❌ Setup exception:', setupException);
        }
      } else {
        console.log('✅ Feedback settings found:', feedbackSettings?.length || 0);
      }
    } catch (error) {
      console.log('❌ Feedback settings exception:', error);
    }

    // Check if user_subscriptions table exists and user has a record
    try {
      const { data: subscriptions, error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (subscriptionError) {
        console.log('❌ User subscriptions error:', subscriptionError.message);
      } else {
        console.log('✅ User subscriptions found:', subscriptions?.length || 0);
      }
    } catch (error) {
      console.log('❌ User subscriptions exception:', error);
    }

    // Check if profiles table exists and user has a record
    try {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .limit(1);

      if (profileError) {
        console.log('❌ Profiles error:', profileError.message);
      } else {
        console.log('✅ Profiles found:', profiles?.length || 0);
      }
    } catch (error) {
      console.log('❌ Profiles exception:', error);
    }

    console.log('🔍 Database check completed');
  } catch (error) {
    console.error('❌ Database check failed:', error);
  }
};