import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, CheckCircle, XCircle, ExternalLink, RefreshCw, RotateCcw, Sparkles, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { usePaystack } from '@/hooks/usePaystack';
import { supabase } from '@/integrations/supabase/client';

interface PaystackPaymentProps {
  plan: 'business' | 'pro';
  planName: string;
  planPrice: string;
  onSuccess: (data: { reference: string; plan: string }) => void;
  onCancel: () => void;
}

interface PaystackConfig {
  key: string;
  email: string;
  amount: number;
  currency: string;
  reference: string;
  callback: (response: any) => void;
  onClose: () => void;
}

declare global {
  interface Window {
    PaystackPop: any;
  }
}

const PaystackPayment: React.FC<PaystackPaymentProps> = ({
  plan,
  planName,
  planPrice,
  onSuccess,
  onCancel
}) => {
  const { user } = useAuth();
  const paystack = usePaystack();
  const [componentError, setComponentError] = useState<string | null>(null);

  // Error boundary for the component
  if (componentError) {
    return (
      <div className="p-6 text-center">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold mb-2">Component Error</p>
            <p className="text-sm mb-4">{componentError}</p>
            <Button 
              onClick={() => window.location.reload()} 
              size="sm" 
              variant="outline"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reload Page
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Plan pricing in kobo (smallest currency unit)
  const planPricing = {
    business: 2600000 // ₦26,000 in kobo
  };

  const amount = planPricing[plan];
  const reference = `notex_${plan}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Plan details with actual Paystack plan codes (LIVE MODE)
  const planDetails = {
    business: {
      name: 'Business Plan',
      planCode: 'PLN_7k87nrcofadvkfe',
      duration: '30 days',
      features: [
        'Unlimited usage across all features',
        'Priority email support',
        'Widget access for integrations',
        'Predictive analytics',
        'Custom Feedback form',
        'Unlimited data retention'
      ]
    }
  };

  // Safe access to plan details
  const currentPlanDetails = planDetails[plan];



  const handlePayment = async () => {
    if (!paystack.isPaystackReady) {
      toast.error('Paystack payment system is still loading. Please wait a moment and try again.');
      return;
    }

    try {
      // Get user email from auth context
      const userEmail = user?.email || 'user@example.com';
      
      if (!userEmail || userEmail === 'user@example.com') {
        toast.error('Please log in to proceed with payment');
        return;
      }

      // Initialize payment using the hook
      await paystack.initializePayment({
        email: userEmail,
        amount: amount,
        currency: 'NGN',
        reference: reference,
      });
    } catch (err) {
      console.error('Payment setup error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to initialize payment');
    }
  };

  const formatPrice = (amountInKobo: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amountInKobo / 100);
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-gray-900">
                Upgrade to {planName}
              </CardTitle>
              <CardDescription className="text-gray-600">
                Complete your payment to activate your {planName} subscription
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Plan Summary */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">Plan:</span>
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200">{currentPlanDetails.name}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">Duration:</span>
                  <span className="text-sm text-gray-600">{currentPlanDetails.duration}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">Price:</span>
                  <span className="text-xl font-bold text-gray-900">{formatPrice(amount)}/month</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">Features:</span>
                  <span className="text-sm text-gray-600">{currentPlanDetails.features.length} features</span>
                </div>
              </div>
            </div>
          </div>

          {/* Plan Benefits */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              Plan Benefits
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentPlanDetails.features.map((feature, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Error Display */}
          {paystack.error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                {paystack.error}
                
                {/* Special handling for Paystack key configuration errors */}
                {paystack.error.includes('Paystack public key not configured') && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="font-semibold text-red-800 mb-2">🔑 Configuration Required</h4>
                    <p className="text-sm text-red-700 mb-3">
                      To fix this issue, you need to configure your Paystack public key:
                    </p>
                    <ol className="text-sm text-red-700 space-y-1 mb-3">
                      <li>1. Get your Paystack key from <a href="https://dashboard.paystack.com/settings/developers" target="_blank" rel="noopener noreferrer" className="underline">Paystack Dashboard</a></li>
                      <li>2. Update the <code className="bg-red-100 px-1 rounded">VITE_PAYSTACK_PUBLIC_KEY</code> in your <code className="bg-red-100 px-1 rounded">.env</code> file</li>
                      <li>3. Also update <code className="bg-red-100 px-1 rounded">supabase/functions/.env</code> with your secret key</li>
                      <li>4. Deploy the Edge Function: <code className="bg-red-100 px-1 rounded">supabase functions deploy verify-payment</code></li>
                      <li>5. Restart your development server</li>
                    </ol>
                    <div className="text-xs text-red-600">
                      <strong>Current key:</strong> {import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'Not set'}
                    </div>
                  </div>
                )}
                
                <div className="mt-2 space-y-2">
                  {/* Network Status */}
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${navigator.onLine ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span>{navigator.onLine ? 'Online' : 'Offline'}</span>
                  </div>
                  
                  {/* Retry Button for Payment Verification Errors */}
                  {(paystack.error.includes('Payment verification failed') || paystack.error.includes('Failed to create subscription') || paystack.error.includes('Failed to update subscription')) && (
                    <Button 
                      onClick={() => {
                        // Reset error state
                        window.location.reload();
                      }} 
                      size="sm" 
                      variant="outline"
                      className="w-full"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Retry Payment Verification
                    </Button>
                  )}
                  
                  <Button 
                    onClick={() => window.location.reload()} 
                    size="sm" 
                    variant="outline"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Refresh Page
                  </Button>
                </div>
                {import.meta.env.DEV && (
                  <div className="mt-2 text-xs">
                    <p>Debug: paystackReady = {paystack.isPaystackReady.toString()}</p>
                    <p>Debug: window.PaystackPop = {window.PaystackPop ? 'exists' : 'missing'}</p>
                    <p>Debug: setup function = {window.PaystackPop?.setup ? 'exists' : 'missing'}</p>
                    <p>Debug: Paystack Key = {import.meta.env.VITE_PAYSTACK_PUBLIC_KEY ? 'Set' : 'Not set'}</p>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {!paystack.isPaystackReady && !paystack.error && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Loading payment system... Please wait a moment before proceeding.
              </AlertDescription>
            </Alert>
          )}

          {!paystack.isPaystackReady && !paystack.error && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-sm text-muted-foreground">
                Initializing payment system...
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                This may take a few seconds on first load
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handlePayment}
              disabled={paystack.loading || !paystack.isPaystackReady}
              className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-8 py-3 rounded-lg font-semibold shadow-sm hover:shadow-md transition-all duration-200 dark:from-green-500 dark:to-green-600 dark:hover:from-green-600 dark:hover:to-green-700"
            >
              {paystack.loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Processing Payment...
                </>
              ) : !paystack.isPaystackReady ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Initializing...
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5 mr-2" />
                  Pay {formatPrice(amount)}
                </>
              )}
            </Button>
            <Button
              onClick={onCancel}
              variant="outline"
              disabled={paystack.loading}
              className="px-8 py-3 rounded-lg font-medium border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-200 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </Button>
          </div>

          {/* Security Notice */}
          <div className="flex items-center justify-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-700 dark:text-green-300 font-medium">
              Your payment is secured by Paystack. We never store your card details.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaystackPayment;