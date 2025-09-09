import { useMemo } from 'react';
import { useUnifiedTrial } from '@/contexts/UnifiedTrialContext';

export interface PlatformAccess {
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
}

export function usePlatformAccess(): PlatformAccess {
  const { trialStatus, checkAccess, isTrialExpired, getTrialMessage } = useUnifiedTrial();

  return useMemo(() => {
    const hasAccess = checkAccess();
    const isLocked = !hasAccess;
    
    let lockReason: 'trial_expired' | 'subscription_inactive' | 'loading' | 'none' = 'none';
    
    if (trialStatus.loading) {
      lockReason = 'loading';
    } else if (trialStatus.plan === 'free_trial' && isTrialExpired()) {
      lockReason = 'trial_expired';
    } else if (trialStatus.plan === 'business' && !trialStatus.isActive) {
      lockReason = 'subscription_inactive';
    }

    // Determine feature access based on trial status
    const canUseWidgets = hasAccess && (trialStatus.plan === 'business' || (trialStatus.plan === 'free_trial' && !isTrialExpired()));
    const canUseFeedback = hasAccess;
    const canUseAnalytics = hasAccess && (trialStatus.plan === 'business' || (trialStatus.plan === 'free_trial' && !isTrialExpired()));
    const canUseReports = hasAccess && (trialStatus.plan === 'business' || (trialStatus.plan === 'free_trial' && !isTrialExpired()));
    const canUseInsights = hasAccess && (trialStatus.plan === 'business' || (trialStatus.plan === 'free_trial' && !isTrialExpired()));
    const canUseTeams = hasAccess && trialStatus.plan === 'business';

    const upgradeRequired = isLocked && lockReason !== 'loading';

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
    };
  }, [trialStatus, checkAccess, isTrialExpired, getTrialMessage]);
}