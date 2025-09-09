import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserStatus } from '@/hooks/useUserStatus';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EmailConfirmationStatus {
  isConfirmed: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useEmailConfirmation = () => {
  const { user } = useAuth();
  const { status: userStatus, refreshStatus } = useUserStatus();
  const [status, setStatus] = useState<EmailConfirmationStatus>({
    isConfirmed: false,
    isLoading: true,
    error: null,
  });

  // Check email confirmation status
  const checkEmailConfirmation = useCallback(() => {
    if (!user) {
      setStatus({
        isConfirmed: false,
        isLoading: false,
        error: null,
      });
      return;
    }

    // Check both Supabase auth and our database
    const authConfirmed = !!user.email_confirmed_at;
    const dbConfirmed = userStatus?.email_confirmed ?? true; // Default to true for backward compatibility
    
    const isConfirmed = authConfirmed && dbConfirmed;
    
    setStatus({
      isConfirmed,
      isLoading: false,
      error: null,
    });
  }, [user, userStatus]);

  // Resend confirmation email
  const resendConfirmationEmail = useCallback(async () => {
    if (!user?.email) {
      toast.error('No email address found');
      return;
    }

    try {
      setStatus(prev => ({ ...prev, isLoading: true }));
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      });

      if (error) {
        throw error;
      }

      toast.success('Confirmation email sent! Please check your inbox.');
    } catch (error) {
      console.error('Error resending confirmation email:', error);
      toast.error('Failed to send confirmation email. Please try again.');
      setStatus(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    } finally {
      setStatus(prev => ({ ...prev, isLoading: false }));
    }
  }, [user]);

  // Refresh confirmation status
  const refreshConfirmationStatus = useCallback(async () => {
    try {
      setStatus(prev => ({ ...prev, isLoading: true }));
      
      // Refresh user session to get latest auth state
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        throw error;
      }

      // Refresh user status from database
      await refreshStatus();
      
      // Re-check confirmation status
      checkEmailConfirmation();
    } catch (error) {
      console.error('Error refreshing confirmation status:', error);
      setStatus(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to refresh status',
        isLoading: false,
      }));
    }
  }, [refreshStatus, checkEmailConfirmation]);

  // Check status when user or userStatus changes
  useEffect(() => {
    checkEmailConfirmation();
  }, [checkEmailConfirmation]);

  return {
    ...status,
    resendConfirmationEmail,
    refreshConfirmationStatus,
  };
};