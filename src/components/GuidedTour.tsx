import React, { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface GuidedTourProps {
  run: boolean;
  onComplete: () => void;
}

const GuidedTour: React.FC<GuidedTourProps> = ({ run, onComplete }) => {
  const { user } = useAuth();
  const [steps, setSteps] = useState<Step[]>([]);

  // Define tour steps
  const tourSteps: Step[] = [
    {
      target: '[data-tour="dashboard-welcome"]',
      content: 'Welcome to your feedback dashboard! This is where you\'ll see all your analytics and insights.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour="onboarding-checklist"]',
      content: 'Complete the onboarding checklist to unlock all features and get the most out of your platform.',
      placement: 'top',
    },
    {
      target: '[data-tour="feedback-metrics"]',
      content: 'Here you can see key metrics like total feedback, sentiment analysis, and active users.',
      placement: 'top',
    },
    {
      target: '[data-tour="feedback-charts"]',
      content: 'Visualize your feedback trends over time with interactive charts and graphs.',
      placement: 'top',
    },
    {
      target: '[data-tour="recent-feedback"]',
      content: 'View your latest feedback entries and their sentiment analysis in real-time.',
      placement: 'left',
    },
    {
      target: '[data-tour="navigation-sidebar"]',
      content: 'Use the sidebar to navigate between different sections of your platform.',
      placement: 'right',
    }
  ];

  // Load user's tour completion status
  const loadTourStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('tour_completed')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading tour status:', error);
      }
    } catch (error) {
      console.error('Error loading tour status:', error);
    }
  };

  // Mark tour as completed
  const markTourCompleted = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ tour_completed: true })
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking tour completed:', error);
    }
  };

  // Handle tour events
  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type } = data;

    if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status)) {
      markTourCompleted();
      onComplete();
    }

    if (type === 'step:after') {
      // Optional: Add analytics tracking here
      console.log('Tour step completed:', data);
    }
  };

  // Load tour status on mount
  useEffect(() => {
    loadTourStatus();
  }, [user]);

  // Set steps
  useEffect(() => {
    setSteps(tourSteps);
  }, []);

  const joyrideProps = {
    steps,
    run,
    continuous: true,
    showProgress: true,
    showSkipButton: true,
    callback: handleJoyrideCallback,
    styles: {
      options: {
        primaryColor: '#3B82F6',
        textColor: '#374151',
        backgroundColor: '#FFFFFF',
        overlayColor: 'rgba(0, 0, 0, 0.4)',
        arrowColor: '#FFFFFF',
        width: 400,
        zIndex: 1000,
      },
      tooltip: {
        borderRadius: 8,
        fontSize: 14,
        padding: 20,
      },
      tooltipContainer: {
        textAlign: 'left' as const,
      },
      tooltipTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
      },
      tooltipContent: {
        fontSize: 14,
        lineHeight: 1.4,
      },
      buttonNext: {
        backgroundColor: '#3B82F6',
        borderRadius: 6,
        fontSize: 14,
        fontWeight: 'bold',
        padding: '8px 16px',
      },
      buttonBack: {
        color: '#6B7280',
        marginRight: 10,
        fontSize: 14,
      },
      buttonSkip: {
        color: '#6B7280',
        fontSize: 14,
      },
      beacon: {
        inner: '#3B82F6',
        outer: '#3B82F6',
      },
    },
    locale: {
      back: 'Back',
      close: 'Close',
      last: 'Finish',
      next: 'Next',
      skip: 'Skip Tour',
    },
  };

  return <Joyride {...joyrideProps} />;
};

export default GuidedTour;