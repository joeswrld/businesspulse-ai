import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { toast } from 'sonner';
import { Loader2, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PaystackPaymentProps {
  plan: 'pro' | 'business';
  planName: string;
  planPrice: string;
  onSuccess: (subscriptionData: any) => void;
  onCancel: () => void;
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
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState(plan === 'pro' ? 3500000 : 5300000); // Amount in kobo

  useEffect(() => {
    // Load Paystack script
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePayment = async () => {
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    if (!email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      // Map selected plan to Paystack plan code
      const planCode = plan === 'pro' ? 'PLN_4z2wpgmw41w2k7r' : 'PLN_esryg99ztsy9xc8';

      // Optional: track upgrade attempt
      try {
        await supabase.from('analytics_events').insert({
          event_type: 'upgrade_attempt',
          event_data: { plan, email },
        });
      } catch {}

      // Resolve public key from env with fallback to provided key
      const publicKey = (import.meta as any)?.env?.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_a5122beb6fd90a988ae6e180b2010fd093a59152';

      // Initialize Paystack payment with plan code. Paystack will create the subscription upon successful charge
      const handler = window.PaystackPop.setup({
        key: publicKey,
        email: email,
        amount: amount, // Plan amount in kobo (overridden by plan, but kept for clarity)
        currency: 'NGN',
        plan: planCode,
        callback: async function(response: any) {
          if (response.status === 'success') {
            toast.success('Payment successful! Activating your subscription...');

            // Let webhook finalize DB state; optimistically refresh usage/limits
            try {
              await supabase.from('analytics_events').insert({
                event_type: 'upgrade_success',
                event_data: { plan, email, reference: response.reference },
              });
            } catch {}

            onSuccess({ reference: response.reference, plan });
          } else {
            toast.error('Payment failed. Please try again.');
          }
          setLoading(false);
        },
        onClose: function() {
          toast.info('Payment window closed');
          setLoading(false);
        }
      });

      handler.openIframe();
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error instanceof Error ? error.message : 'Payment failed');
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Subscribe to {planName}</span>
          <span className="text-2xl font-bold text-green-600">{planPrice}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center space-x-2 text-sm text-blue-700">
            <CreditCard className="h-4 w-4" />
            <span>Secure payment powered by Paystack</span>
          </div>
        </div>

        <div className="space-y-2">
          <Button
            onClick={handlePayment}
            disabled={loading || !email}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              `Subscribe to ${planName} - ${planPrice}`
            )}
          </Button>
          
          <Button
            onClick={onCancel}
            variant="outline"
            disabled={loading}
            className="w-full"
          >
            Cancel
          </Button>
        </div>

        <div className="text-xs text-gray-500 text-center">
          By subscribing, you agree to our Terms of Service and Privacy Policy.
          You can cancel your subscription at any time.
        </div>
      </CardContent>
    </Card>
  );
};

export default PaystackPayment;