import { useMemo } from 'react';
import { useUnifiedTrial } from '@/contexts/UnifiedTrialContext';

export interface UnifiedPlatformAccess {
  hasAccess: boolean;
  isLocked: boolean;
  lockReason: 'trial_expired' | 'subscription_inactive' | 'loading' | 'none';
  canUseWidgets: boolean;
  canUseFeedback: boolean;
  canUseAnalytics: boolean;
  canUseReports: boolean;
  canUseInsights: boolean;
  canUseTeams: boolean;
  trialMessage: string;
  upgradeRequired: boolean;
  isNewUser: boolean;
  isBusinessUser: boolean;
  isTrialUser: boolean;
}

export function useUnifiedPlatformAccess(): UnifiedPlatformAccess {
  const { trialStatus, checkAccess, isTrialExpired, getTrialMessage, getLockReason } = useUnifiedTrial();

  return useMemo(() => {
    const hasAccess = checkAccess();
    const isLocked = !hasAccess;
    const lockReason = getLockReason();
    
    // Determine user type
    const isNewUser = trialStatus.plan === 'free_trial' && !trialStatus.trialStart;
    const isBusinessUser = trialStatus.plan === 'business' && trialStatus.subscriptionActive;
    const isTrialUser = trialStatus.plan === 'free_trial' && !isTrialExpired();

    // Determine feature access based on trial status
    const canUseWidgets = hasAccess && (isBusinessUser || isTrialUser);
    const canUseFeedback = hasAccess && (isBusinessUser || isTrialUser);
    const canUseAnalytics = hasAccess && (isBusinessUser || isTrialUser);
    const canUseReports = hasAccess && (isBusinessUser || isTrialUser);
    const canUseInsights = hasAccess && (isBusinessUser || isTrialUser);
    const canUseTeams = hasAccess && isBusinessUser; // Teams only for business users

    const upgradeRequired = isLocked && lockReason !== 'loading';

    console.log('🔐 UnifiedPlatformAccess check:', {
      hasAccess,
      isLocked,
      lockReason,
      isNewUser,
      isBusinessUser,
      isTrialUser,
      canUseWidgets,
      canUseFeedback,
      canUseAnalytics,
      canUseReports,
      canUseInsights,
      canUseTeams,
      upgradeRequired
    });

    return {
      hasAccess,
      isLocked,
      lockReason,
      canUseWidgets,
      canUseFeedback,
      canUseAnalytics,
      canUseReports,
      canUseInsights,
      canUseTeams,
      trialMessage: getTrialMessage(),
      upgradeRequired,
      isNewUser,
      isBusinessUser,
      isTrialUser,
    };
  }, [trialStatus, checkAccess, isTrialExpired, getTrialMessage, getLockReason]);
}