// src/lib/trial.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function initializeTrial(user: { id: string, email: string, full_name: string, company_name?: string }) {
  try {
    const trialStart = new Date();
    const trialEnd = new Date(trialStart.getTime() + 8 * 24 * 60 * 60 * 1000); // 8 days

    // Update profiles table
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      company_name: user.company_name || 'Individual User',
      trial_start: trialStart.toISOString(),
      trial_end: trialEnd.toISOString(),
      subscription_status: 'trial',
      plan_status: 'trial',
      updated_at: new Date().toISOString()
    });

    if (profileError) {
      console.error('Error initializing trial in profiles table:', profileError);
    }

    // Create billing profile
    const { error: billingError } = await supabase.from('billing_profiles').upsert({
      id: user.id,
      plan: 'trial',
      trial_ends_at: trialEnd.toISOString(),
      subscription_status: 'trial',
      paystack_customer_id: null,
      paystack_subscription_id: null,
      next_billing_date: null,
      updated_at: new Date().toISOString()
    });

    if (billingError) {
      console.error('Error creating billing profile for trial:', billingError);
    }

    console.log(`Trial initialized for user: ${user.email} (ends ${trialEnd.toISOString()})`);
    return { trialStart, trialEnd };

  } catch (error) {
    console.error('Error initializing trial:', error);
    throw error;
  }
}
