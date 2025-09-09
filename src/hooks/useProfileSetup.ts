import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function useProfileSetup() {
  const { user } = useAuth();

  useEffect(() => {
    const setupProfileForExistingUser = async () => {
      if (!user) return;

      try {
        // Check if user already has a profile
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('user_id', user.id)
          .single();

        // If no profile exists, create one using our safe function
        if (!existingProfile) {
          console.log('🔧 Setting up profile for existing user:', user.email);
          
          const { data: result, error } = await supabase.rpc('create_user_profile_safe', {
            user_uuid: user.id,
            user_email: user.email,
            first_name: null,
            last_name: null,
            company_name: null
          });

          if (error) {
            console.error('❌ Failed to create profile for existing user:', error);
          } else {
            console.log('✅ Profile created for existing user:', result);
          }
        }
      } catch (error) {
        console.error('❌ Error checking/creating profile:', error);
      }
    };

    // Only run for authenticated users
    if (user) {
      setupProfileForExistingUser();
    }
  }, [user]);
}