import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, ArrowRight, Sparkles, Code, MessageSquare, Palette, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useOnboarding } from '@/hooks/useOnboarding';

const OnboardingChecklist: React.FC = () => {
  const {
    steps,
    checklist,
    progress,
    loading,
    markStepCompleted,
    getStepStatus,
    getStepCompletionTime,
    getCurrentStep,
    getCompletionPercentage
  } = useOnboarding();

  // Icon mapping
  const getStepIcon = (iconName: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      'code': <Code className="h-5 w-5" />,
      'message-square': <MessageSquare className="h-5 w-5" />,
      'sparkles': <Sparkles className="h-5 w-5" />,
      'palette': <Palette className="h-5 w-5" />,
      'users': <Users className="h-5 w-5" />
    };
    return iconMap[iconName] || <Circle className="h-5 w-5" />;
  };

  // Handle step completion with toast
  const handleStepCompleted = async (stepId: string) => {
    try {
      await markStepCompleted(stepId);
      toast.success('Step completed! 🎉');
    } catch (error) {
      toast.error('Failed to mark step as completed');
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading onboarding checklist...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Don't show if onboarding is completed
  if (progress?.is_completed) {
    return (
      <Card className="w-full border-green-200 bg-green-50">
        <CardContent className="p-6 text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-green-900 mb-2">Onboarding Complete! 🎉</h3>
          <p className="text-green-700 mb-4">
            You've completed all onboarding steps. You're ready to make the most of your feedback platform!
          </p>
          <Button 
            variant="outline" 
            className="border-green-300 text-green-700 hover:bg-green-100"
            onClick={() => window.location.href = '/feedback-settings'}
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Continue to Settings
          </Button>
        </CardContent>
      </Card>
    );
  }

  const currentStep = getCurrentStep();
  const completionPercentage = getCompletionPercentage();

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              <span>Getting Started</span>
            </CardTitle>
            <CardDescription>
              Complete these steps to unlock the full potential of your feedback platform
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-blue-600 border-blue-200">
            {progress?.completed_steps || 0} of {progress?.total_steps || 0} completed
          </Badge>
        </div>
        
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Progress</span>
            <span>{completionPercentage}%</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {steps.map((step, index) => {
          const isCompleted = getStepStatus(step.id);
          const isCurrent = step.id === progress?.current_step;
          const completionTime = getStepCompletionTime(step.id);

          return (
            <div
              key={step.id}
              className={`flex items-start space-x-4 p-4 rounded-lg border-2 transition-all duration-200 ${
                isCompleted
                  ? 'border-green-200 bg-green-50'
                  : isCurrent
                  ? 'border-blue-200 bg-blue-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              {/* Step Icon */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                isCompleted
                  ? 'bg-green-100 text-green-600'
                  : isCurrent
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-400'
              }`}>
                {isCompleted ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  getStepIcon(step.icon)
                )}
              </div>

              {/* Step Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className={`font-semibold ${
                    isCompleted ? 'text-green-900' : isCurrent ? 'text-blue-900' : 'text-gray-900'
                  }`}>
                    {step.title}
                  </h4>
                  {isCompleted && completionTime && (
                    <span className="text-xs text-green-600">
                      Completed {new Date(completionTime).toLocaleDateString()}
                    </span>
                  )}
                </div>
                
                <p className={`text-sm mt-1 ${
                  isCompleted ? 'text-green-700' : isCurrent ? 'text-blue-700' : 'text-gray-600'
                }`}>
                  {step.description}
                </p>

                {/* Action Button */}
                {!isCompleted && (
                  <div className="mt-3">
                    {step.id === 'install_widget' && (
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => window.location.href = '/feedback-settings'}
                      >
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Configure Widget
                      </Button>
                    )}
                    
                    {step.id === 'get_first_feedback' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Check if user has feedback, if so mark as completed
                          handleStepCompleted(step.id);
                        }}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Check for Feedback
                      </Button>
                    )}
                    
                    {step.id === 'generate_insight' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.location.href = '/insights-simple'}
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Insight
                      </Button>
                    )}
                    
                    {step.id === 'customize_branding' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.location.href = '/feedback-settings'}
                      >
                        <Palette className="h-4 w-4 mr-2" />
                        Customize Branding
                      </Button>
                    )}
                    
                    {step.id === 'invite_team' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.location.href = '/teams'}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Invite Team
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Step Number */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                isCompleted
                  ? 'bg-green-200 text-green-800'
                  : isCurrent
                  ? 'bg-blue-200 text-blue-800'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {index + 1}
              </div>
            </div>
          );
        })}

        {/* Next Steps */}
        {currentStep && !progress?.is_completed && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Next Step</h4>
            <p className="text-blue-700 text-sm">
              {currentStep.description}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OnboardingChecklist;