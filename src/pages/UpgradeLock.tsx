import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserStatus } from '@/hooks/useUserStatus';
import LockScreen from '@/components/LockScreen';
import PaystackPayment from '@/components/PaystackPayment';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Lock, 
  Crown, 
  Zap, 
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowLeft
} from 'lucide-react';

const UpgradeLock: React.FC = () => {
  const { user } = useAuth();
  const { status, loading, refreshStatus } = useUserStatus();
  const navigate = useNavigate();
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  if (loading || !status) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isTrialExpired = status.plan === 'free_trial' && status.is_trial_expired;
  const isBusinessInactive = status.plan === 'business' && !status.is_active;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleUpgrade = (plan: 'business') => {
    setShowPayment(true);
  };

  const handleRetry = () => {
    refreshStatus();
  };

  const handlePaymentSuccess = () => {
    // Refresh status after successful payment
    refreshStatus();
    setShowPayment(false);
    // Redirect to dashboard
    navigate('/dashboard');
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    setShowPayment(false);
  };

  if (showPayment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Upgrade to Business Plan
            </h2>
            <p className="text-gray-600">
              Complete your payment to unlock all features
            </p>
          </div>
          
          <PaystackPayment
            plan="business"
            planName="Business Plan"
            planPrice="₦53,000"
            onSuccess={() => handlePaymentSuccess()}
            onCancel={() => setShowPayment(false)}
          />
          
          <Button
            onClick={() => setShowPayment(false)}
            variant="outline"
            className="w-full mt-4"
          >
            Cancel
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Back button */}
        <div className="mb-6">
          <Button
            onClick={() => navigate('/dashboard')}
            variant="ghost"
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <Card className="p-8 text-center shadow-xl border-0">
          <div className="mb-6">
            <div className="p-4 bg-red-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <Lock className="h-10 w-10 text-red-600" />
            </div>
            
            {isTrialExpired && (
              <>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Free Trial Expired
                </h1>
                <div className="mb-4 space-y-2">
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    <Clock className="h-3 w-3 mr-1" />
                    Trial ended: {formatDate(status.trial_end)}
                  </Badge>
                </div>
                <p className="text-gray-600 mb-6">
                  Your 8-day free trial has expired. Upgrade to Business plan to continue 
                  collecting feedback and generating insights.
                </p>
              </>
            )}

            {isBusinessInactive && (
              <>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Subscription Inactive
                </h1>
                <div className="mb-4 space-y-2">
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Business Plan - Inactive
                  </Badge>
                </div>
                <p className="text-gray-600 mb-6">
                  Your Business subscription is currently inactive. This could be due to a 
                  payment issue or subscription cancellation. Please contact support or 
                  reactivate your subscription.
                </p>
              </>
            )}
          </div>

          {/* Features locked behind paywall */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">What you're missing:</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Unlimited feedback collection</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Advanced AI insights</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Comprehensive analytics</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Detailed reports</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Priority support</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            {isTrialExpired && (
              <Button
                onClick={() => handleUpgrade('business')}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                size="lg"
              >
                <Crown className="h-5 w-5 mr-2" />
                Upgrade to Business Plan
              </Button>
            )}

            {isBusinessInactive && (
              <>
                <Button
                  onClick={() => handleUpgrade('business')}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  size="lg"
                >
                  <Zap className="h-5 w-5 mr-2" />
                  Reactivate Subscription
                </Button>
                
                <Button
                  onClick={handleRetry}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  Check Status Again
                </Button>
              </>
            )}

            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Need help? Contact our support team for assistance.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default UpgradeLock;