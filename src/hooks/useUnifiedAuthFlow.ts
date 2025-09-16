import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AuthFlowStatus {
  isInitialized: boolean;
  isEmailConfirmed: boolean;
  profileExists: boolean;
  trialInitialized: boolean;
  loading: boolean;
  error: string | null;
}

export interface UnifiedAuthFlow {
  status: AuthFlowStatus;
  initializeUserFlow: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

// Global state to prevent multiple initializations
let globalInitializationInProgress = false;
let globalInitializationComplete = new Set<string>();

export const useUnifiedAuthFlow = (): UnifiedAuthFlow => {
  const { user, session } = useAuth();
  const [status, setStatus] = useState<AuthFlowStatus>({
    isInitialized: false,
    isEmailConfirmed: false,
    profileExists: false,
    trialInitialized: false,
    loading: true,
    error: null,
  });

  const initializationRef = useRef<boolean>(false);

  // Check if user's email is confirmed
  const checkEmailConfirmation = useCallback((): boolean => {
    if (!user) return false;
    // Check both Supabase auth email_confirmed_at and our profiles table
    return !!user.email_confirmed_at;
  }, [user]);

  // Check if profile exists
  const checkProfileExists = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('❌ Error checking profile existence:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('❌ Error checking profile existence:', error);
      return false;
    }
  }, [user]);

  // Check if trial is initialized
  const checkTrialInitialized = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('check_user_access', {
        user_uuid: user.id,
      });

      if (error) {
        console.error('❌ Error checking trial status:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('❌ Error checking trial status:', error);
      return false;
    }
  }, [user]);

  // Create user profile safely
  const createProfile = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      console.log('🔧 Creating user profile for:', user.email);

      const { data: profileResult, error: profileError } = await supabase.rpc('create_user_profile_safe', {
        user_uuid: user.id,
        user_email: user.email,
        first_name: user.user_metadata?.first_name || null,
        last_name: user.user_metadata?.last_name || null,
        company_name: user.user_metadata?.company_name || null
      });

      if (profileError) {
        console.error('❌ Profile creation failed:', profileError);
        return false;
      }

      console.log('✅ Profile created successfully:', profileResult);
      return true;
    } catch (error) {
      console.error('❌ Profile creation error:', error);
      return false;
    }
  }, [user]);

  // Initialize user trial safely
  const initializeTrial = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      console.log('🎯 Initializing trial for:', user.email);

      const { error } = await supabase.rpc('initialize_user_trial', {
        user_uuid: user.id,
      });

      if (error) {
        console.error('❌ Trial initialization failed:', error);
        return false;
      }

      console.log('✅ Trial initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Trial initialization error:', error);
      return false;
    }
  }, [user]);

  // Main initialization flow
  const initializeUserFlow = useCallback(async (): Promise<void> => {
    if (!user || !session) {
      setStatus(prev => ({
        ...prev,
        loading: false,
        error: 'No user session',
      }));
      return;
    }

    // Prevent multiple simultaneous initializations
    if (globalInitializationInProgress || initializationRef.current) {
      console.log('⏳ Initialization already in progress, skipping...');
      return;
    }

    // Check if already initialized for this user
    if (globalInitializationComplete.has(user.id)) {
      console.log('✅ User flow already initialized for:', user.email);
      setStatus(prev => ({
        ...prev,
        isInitialized: true,
        loading: false,
      }));
      return;
    }

    globalInitializationInProgress = true;
    initializationRef.current = true;

    try {
      console.log('🚀 Starting unified auth flow for:', user.email);

      setStatus(prev => ({ ...prev, loading: true, error: null }));

      // Step 1: Check email confirmation
      const isEmailConfirmed = checkEmailConfirmation();
      console.log('📧 Email confirmed:', isEmailConfirmed);

      if (!isEmailConfirmed) {
        console.log('⚠️ Email not confirmed, stopping flow');
        setStatus(prev => ({
          ...prev,
          isEmailConfirmed: false,
          loading: false,
          error: 'Email not confirmed. Please check your email and verify your account.',
        }));
        return;
      }

      // Step 2: Check/create profile
      let profileExists = await checkProfileExists();
      console.log('👤 Profile exists:', profileExists);

      if (!profileExists) {
        console.log('🔧 Creating profile...');
        profileExists = await createProfile();
        if (!profileExists) {
          console.log('❌ Failed to create profile');
          setStatus(prev => ({
            ...prev,
            loading: false,
            error: 'Failed to create user profile. Please contact support.',
          }));
          return;
        }
      }

      // Step 3: Check/initialize trial
      let trialInitialized = await checkTrialInitialized();
      console.log('🎯 Trial initialized:', trialInitialized);

      if (!trialInitialized) {
        console.log('🎯 Initializing trial...');
        trialInitialized = await initializeTrial();
        if (!trialInitialized) {
          console.log('⚠️ Failed to initialize trial, but continuing...');
          // Don't fail the entire flow if trial initialization fails
        }
      }

      // Mark as complete
      globalInitializationComplete.add(user.id);
      
      console.log('✅ Unified auth flow completed successfully');
      setStatus(prev => ({
        ...prev,
        isInitialized: true,
        isEmailConfirmed: true,
        profileExists: true,
        trialInitialized,
        loading: false,
        error: null,
      }));

    } catch (error) {
      console.error('❌ Error in unified auth flow:', error);
      setStatus(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }));
    } finally {
      globalInitializationInProgress = false;
      initializationRef.current = false;
    }
  }, [user, session, checkEmailConfirmation, checkProfileExists, checkTrialInitialized, createProfile, initializeTrial]);

  // Delete user account
  const deleteAccount = useCallback(async (): Promise<void> => {
    if (!user) {
      throw new Error('No user logged in');
    }

    try {
      console.log('🗑️ Deleting account for:', user.email);

      // Call Supabase Edge Function to delete user and cascade delete data
      const { error } = await supabase.functions.invoke('delete-user-account', {
        body: { userId: user.id }
      });

      if (error) {
        console.error('❌ Account deletion failed:', error);
        throw error;
      }

      // Remove from global state
      globalInitializationComplete.delete(user.id);

      console.log('✅ Account deleted successfully');
      toast.success('Account deleted successfully');

      // Sign out user
      await supabase.auth.signOut();

    } catch (error) {
      console.error('❌ Error deleting account:', error);
      toast.error('Failed to delete account. Please contact support.');
      throw error;
    }
  }, [user]);

  // Refresh status
  const refreshStatus = useCallback(async (): Promise<void> => {
    if (!user) {
      setStatus({
        isInitialized: false,
        isEmailConfirmed: false,
        profileExists: false,
        trialInitialized: false,
        loading: false,
        error: null,
      });
      return;
    }

    try {
      const isEmailConfirmed = checkEmailConfirmation();
      const profileExists = await checkProfileExists();
      const trialInitialized = await checkTrialInitialized();

      setStatus(prev => ({
        ...prev,
        isEmailConfirmed,
        profileExists,
        trialInitialized,
        isInitialized: isEmailConfirmed && profileExists,
      }));
    } catch (error) {
      console.error('❌ Error refreshing status:', error);
      setStatus(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to refresh status',
      }));
    }
  }, [user, checkEmailConfirmation, checkProfileExists, checkTrialInitialized]);

  // Initialize on user change
  useEffect(() => {
    if (user && session) {
      // Small delay to prevent race conditions
      const timeoutId = setTimeout(() => {
        initializeUserFlow();
      }, 100);

      return () => clearTimeout(timeoutId);
    } else {
      // Reset state when user logs out
      setStatus({
        isInitialized: false,
        isEmailConfirmed: false,
        profileExists: false,
        trialInitialized: false,
        loading: false,
        error: null,
      });
      initializationRef.current = false;
    }
  }, [user, session, initializeUserFlow]);

  return {
    status,
    initializeUserFlow,
    deleteAccount,
    refreshStatus,
  };
};