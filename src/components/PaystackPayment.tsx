import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Plan pricing in kobo (smallest currency unit)
  const planPricing = {
    pro: 3500000, // ₦35,000 in kobo
    business: 5300000 // ₦53,000 in kobo
  };

  const amount = planPricing[plan];
  const reference = `notex_${plan}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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
    setLoading(true);
    setError(null);

    try {
      // Get user email from auth context or localStorage
      const userEmail = localStorage.getItem('userEmail') || 'user@example.com';

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
              <Badge variant="secondary">{planName}</Badge>
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
              {plan === 'pro' && (
                <>
                  <li>• 300 feedback submissions (6x increase)</li>
                  <li>• 50 AI insights (10x increase)</li>
                  <li>• 100 analytics reports (20x increase)</li>
                  <li>• PDF & Excel export formats</li>
                  <li>• Email + Chat support</li>
                  <li>• 12 months data retention</li>
                </>
              )}
              {plan === 'business' && (
                <>
                  <li>• Unlimited usage across all features</li>
                  <li>• Priority phone support</li>
                  <li>• API access for integrations</li>
                  <li>• Predictive analytics</li>
                  <li>• Custom integrations</li>
                  <li>• Unlimited data retention</li>
                </>
              )}
            </ul>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handlePayment}
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
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