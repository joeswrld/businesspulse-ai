// src/components/TrialComponents.tsx
import React, { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrialAccess } from '@/contexts/TrialContext';
import { Lock, Crown, Clock, AlertTriangle, CheckCircle, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FeatureGuardProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
  showBanner?: boolean;
}

export const FeatureGuard: React.FC<FeatureGuardProps> = ({ 
  feature, 
  children, 
  fallback,
  showBanner = true
}) => {
  const { trialStatus, checkFeatureAccess } = useTrialAccess();
  const navigate = useNavigate();

  if (trialStatus.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-indigo-950">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!checkFeatureAccess(feature)) {
    return fallback || <TrialExpiredBlock />;
  }

  return (
    <>
      {showBanner && <TrialCountdownBanner />}
      {children}
    </>
  );
};

export const TrialExpiredBlock: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-red-950 dark:to-orange-950 p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-red-500 to-orange-500 p-8 text-center">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Trial Expired</h1>
          <p className="text-white/90 text-lg">Your 8-day free trial has ended</p>
        </div>

        <div className="p-8 space-y-6">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-1">
                  Access Restricted
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  Your free trial has expired. Upgrade to the Business Plan to continue accessing:
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              'Real-time Feedback Collection',
              'Customer Satisfaction Surveys',
              'Product Feedback Forms',
              'AI-Powered Insights',
              'Feedback Analytics Dashboard',
              'Customizable Widgets'
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button 
              onClick={() => navigate('/billing')}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-4 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <Crown className="h-5 w-5" />
              <span>Upgrade to Business Plan</span>
            </Button>
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
              Starting at ₦26,000/month • Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const TrialCountdownBanner: React.FC = () => {
  const { trialStatus } = useTrialAccess();
  const navigate = useNavigate();

  if (!trialStatus.isInTrial || trialStatus.isTrialExpired) {
    return null;
  }

  const urgency = trialStatus.daysLeft <= 2 ? 'high' : trialStatus.daysLeft <= 5 ? 'medium' : 'low';
  
  const bannerColors = {
    high: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    medium: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    low: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
  };

  const textColors = {
    high: 'text-red-700 dark:text-red-300',
    medium: 'text-yellow-700 dark:text-yellow-300',
    low: 'text-blue-700 dark:text-blue-300'
  };

  return (
    <div className={`${bannerColors[urgency]} border-l-4 p-4 rounded-lg mb-6`}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center space-x-3">
          <Clock className={`h-5 w-5 ${textColors[urgency]}`} />
          <div>
            <p className={`font-semibold ${textColors[urgency]}`}>
              {trialStatus.daysLeft} {trialStatus.daysLeft === 1 ? 'day' : 'days'} left in your free trial
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Upgrade now to keep accessing all features after your trial ends
            </p>
          </div>
        </div>
        <Button 
          onClick={() => navigate('/billing')}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-all flex items-center space-x-1"
        >
          <Crown className="h-4 w-4" />
          <span>Upgrade Now</span>
        </Button>
      </div>
    </div>
  );
};

export const TrialStatusBadge: React.FC = () => {
  const { trialStatus } = useTrialAccess();

  if (trialStatus.hasActiveSubscription) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-full">
        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        <span className="text-sm font-medium text-green-700 dark:text-green-300">
          Business Plan Active
        </span>
      </div>
    );
  }

  if (trialStatus.isInTrial && !trialStatus.isTrialExpired) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-full">
        <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
          Free Trial ({trialStatus.daysLeft} days left)
        </span>
      </div>
    );
  }

  return null;
};
