import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  order_index: number;
  is_active: boolean;
}

interface ChecklistItem {
  id: string;
  user_id: string;
  step_id: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface OnboardingProgress {
  id: string;
  user_id: string;
  total_steps: number;
  completed_steps: number;
  current_step: string;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useOnboarding = () => {
  const { user } = useAuth();
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [loading, setLoading] = useState(true);

  // Load onboarding data
  const loadOnboardingData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      const [stepsResult, progressResult, checklistResult] = await Promise.all([
        supabase
          .from('onboarding_steps')
          .select('*')
          .eq('is_active', true)
          .order('order_index'),
        
        supabase
          .from('onboarding_progress')
          .select('*')
          .eq('user_id', user.id)
          .single(),
        
        supabase
          .from('onboarding_checklist')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at')
      ]);

      if (stepsResult.error) throw stepsResult.error;
      if (progressResult.error && progressResult.error.code !== 'PGRST116') throw progressResult.error;
      if (checklistResult.error) throw checklistResult.error;

      setSteps(stepsResult.data || []);
      setProgress(progressResult.data || null);
      setChecklist(checklistResult.data || []);

    } catch (error) {
      console.error('Error loading onboarding data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Mark step as completed
  const markStepCompleted = useCallback(async (stepId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('update_onboarding_progress', {
        p_user_id: user.id,
        p_step_id: stepId
      });

      if (error) throw error;

      // Reload data to get updated progress
      await loadOnboardingData();

    } catch (error) {
      console.error('Error marking step completed:', error);
      throw error;
    }
  }, [user, loadOnboardingData]);

  // Get step completion status
  const getStepStatus = useCallback((stepId: string) => {
    const item = checklist.find(item => item.step_id === stepId);
    return item?.completed || false;
  }, [checklist]);

  // Get step completion time
  const getStepCompletionTime = useCallback((stepId: string) => {
    const item = checklist.find(item => item.step_id === stepId);
    return item?.completed_at;
  }, [checklist]);

  // Get current step
  const getCurrentStep = useCallback(() => {
    if (!progress) return null;
    return steps.find(step => step.id === progress.current_step);
  }, [progress, steps]);

  // Get completion percentage
  const getCompletionPercentage = useCallback(() => {
    if (!progress || progress.total_steps === 0) return 0;
    return Math.round((progress.completed_steps / progress.total_steps) * 100);
  }, [progress]);

  // Check if user is new (created within last 7 days)
  const isNewUser = useCallback(() => {
    if (!user) return false;
    const userCreatedAt = new Date(user.created_at);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return userCreatedAt > sevenDaysAgo;
  }, [user]);

  // Load data on mount
  useEffect(() => {
    loadOnboardingData();
  }, [loadOnboardingData]);

  return {
    steps,
    checklist,
    progress,
    loading,
    loadOnboardingData,
    markStepCompleted,
    getStepStatus,
    getStepCompletionTime,
    getCurrentStep,
    getCompletionPercentage,
    isNewUser: isNewUser()
  };
};