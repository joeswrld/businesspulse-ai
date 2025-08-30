import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface PaystackPaymentProps {
  plan: 'pro' | 'business';
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
    PaystackPop: {
      setup: (config: PaystackConfig) => { openIframe: () => void };
    };
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paystackReady, setPaystackReady] = useState(false);

  // Plan pricing in kobo (smallest currency unit)
  const planPricing = {
    pro: 3500000, // ₦35,000 in kobo
    business: 5300000 // ₦53,000 in kobo
  };

  const amount = planPricing[plan];
  const reference = `notex_${plan}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Plan details
  const planDetails = {
    pro: {
      name: 'Pro Plan',
      duration: '30 days',
      features: [
        '300 feedback submissions (6x increase)',
        '50 AI insights (10x increase)',
        '100 analytics reports (20x increase)',
        'PDF & Excel export formats',
        'Email + Chat support',
        '12 months data retention'
      ]
    },
    business: {
      name: 'Business Plan',
      duration: '30 days',
      features: [
        'Unlimited usage across all features',
        'Priority phone support',
        'API access for integrations',
        'Predictive analytics',
        'Custom integrations',
        'Unlimited data retention'
      ]
    }
  };

  useEffect(() => {
    // Load Paystack script if not already loaded
    if (!window.PaystackPop) {
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      script.onload = () => {
        console.log('Paystack script loaded');
      };
      script.onerror = () => {
        setError('Failed to load Paystack payment system');
      };
      document.head.appendChild(script);
    }
  }, []);

  const handlePayment = async () => {
    if (!paystackReady) {
      setError('Paystack payment system is still loading. Please wait a moment and try again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get user email from auth context
      const userEmail = user?.email || 'user@example.com';
      
      if (!userEmail || userEmail === 'user@example.com') {
        setError('Please log in to proceed with payment');
        setLoading(false);
        return;
      }

      const config: PaystackConfig = {
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || 'pk_test_...',
        email: userEmail,
        amount: amount,
        currency: 'NGN',
        reference: reference,
        callback: async (response: any) => {
          try {
            console.log('Paystack response:', response);
            
            if (response.status === 'success') {
              // Call your API to update the user's subscription
              const updateResponse = await fetch('/api/paystack/verify-payment', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  reference: response.reference,
                  plan: plan,
                  amount: amount,
                  email: userEmail
                }),
              });

              const updateData = await updateResponse.json();

              if (updateResponse.ok) {
                toast.success(`🎉 Welcome to ${planName}! Your subscription has been activated.`);
                onSuccess({ reference: response.reference, plan });
              } else {
                throw new Error(updateData.error || 'Failed to update subscription');
              }
            } else {
              throw new Error('Payment was not successful');
            }
          } catch (err) {
            console.error('Payment verification error:', err);
            setError(err instanceof Error ? err.message : 'Payment verification failed');
            toast.error('Payment verification failed. Please contact support.');
          } finally {
            setLoading(false);
          }
        },
        onClose: () => {
          setLoading(false);
          toast.info('Payment cancelled');
        }
      };

      if (window.PaystackPop) {
        const handler = window.PaystackPop.setup(config);
        handler.openIframe();
      } else {
        throw new Error('Paystack payment system not loaded');
      }
    } catch (err) {
      console.error('Payment setup error:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize payment');
      setLoading(false);
    }
  };

  const formatPrice = (amountInKobo: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amountInKobo / 100);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Upgrade to {planName}
          </CardTitle>
          <CardDescription>
            Complete your payment to activate your {planName} subscription
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Plan Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Plan:</span>
              <Badge variant="secondary">{planDetails[plan].name}</Badge>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Duration:</span>
              <span className="text-sm text-gray-600">{planDetails[plan].duration}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Price:</span>
              <span className="text-lg font-bold">{formatPrice(amount)}/month</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Reference:</span>
              <span className="text-sm text-gray-600 font-mono">{reference}</span>
            </div>
          </div>

          {/* Plan Benefits */}
          <div className="space-y-2">
            <h4 className="font-medium">Plan Benefits:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {planDetails[plan].features.map((feature, index) => (
                <li key={index}>• {feature}</li>
              ))}
            </ul>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!paystackReady && !error && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Loading payment system... Please wait a moment before proceeding.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handlePayment}
              disabled={loading || !paystackReady}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : !paystackReady ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading Payment System...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay {formatPrice(amount)}
                </>
              )}
            </Button>
            <Button
              onClick={onCancel}
              variant="outline"
              disabled={loading}
            >
              Cancel
            </Button>
          </div>

          {/* Security Notice */}
          <div className="text-xs text-gray-500 text-center">
            🔒 Your payment is secured by Paystack. We never store your card details.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaystackPayment;