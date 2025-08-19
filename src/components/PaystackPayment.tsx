import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';

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
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank'>('card');
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
      // Create subscription via our Supabase function
      const response = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          plan: plan,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create subscription');
      }

      // Initialize Paystack payment
      const handler = window.PaystackPop.setup({
        key: 'pk_test_a5122beb6fd90a988ae6e180b2010fd093a59152', // Your Paystack public key
        email: email,
        amount: amount,
        currency: 'NGN',
        plan: data.subscription.subscription_code,
        callback: async function(response: any) {
          if (response.status === 'success') {
            // Payment successful
            toast.success('Payment successful! Your subscription is now active.');
            onSuccess(data.subscription);
          } else {
            toast.error('Payment failed. Please try again.');
            setLoading(false);
          }
        },
        onClose: function() {
          toast.info('Payment cancelled');
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

  const handleBankTransfer = async () => {
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);

    try {
      // Create subscription for bank transfer
      const response = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          plan: plan,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create subscription');
      }

      toast.success('Subscription created! Please complete your bank transfer to activate your plan.');
      onSuccess(data.subscription);

    } catch (error) {
      console.error('Subscription creation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create subscription');
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

        <div className="space-y-2">
          <Label>Payment Method</Label>
          <Select value={paymentMethod} onValueChange={(value: 'card' | 'bank') => setPaymentMethod(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="card">
                <div className="flex items-center space-x-2">
                  <CreditCard className="h-4 w-4" />
                  <span>Credit/Debit Card</span>
                </div>
              </SelectItem>
              <SelectItem value="bank">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Bank Transfer</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {paymentMethod === 'card' && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-2 text-sm text-blue-700">
              <CreditCard className="h-4 w-4" />
              <span>Secure payment powered by Paystack</span>
            </div>
          </div>
        )}

        {paymentMethod === 'bank' && (
          <div className="p-4 bg-yellow-50 rounded-lg">
            <div className="flex items-center space-x-2 text-sm text-yellow-700">
              <AlertCircle className="h-4 w-4" />
              <span>You'll receive bank transfer details after subscription creation</span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Button
            onClick={paymentMethod === 'card' ? handlePayment : handleBankTransfer}
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