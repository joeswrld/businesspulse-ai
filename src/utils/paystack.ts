declare global {
    interface Window {
      PaystackPop: any;
    }
  }
  
  interface PaymentOptions {
    email: string;
    amount: number;
    userId: string;
    plan: string;
    onSuccess: (reference: string) => void;
    onCancel: () => void;
  }
  
  export function initializePayment(options: PaymentOptions) {
    const handler = window.PaystackPop.setup({
      key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
      email: options.email,
      amount: options.amount * 100, // Convert to kobo
      currency: 'NGN',
      ref: `${Date.now()}-${options.userId}`,
      metadata: {
        user_id: options.userId,
        plan: options.plan,
      },
      callback: function(response: any) {
        options.onSuccess(response.reference);
      },
      onClose: function() {
        options.onCancel();
      },
    });
    
    handler.openIframe();
  }
  
  // Usage in Billing component:
  function handleUpgrade() {
    initializePayment({
      email: user.email,
      amount: 53000,
      userId: user.id,
      plan: 'business',
      onSuccess: async (reference) => {
        // Payment successful - webhook will update DB
        toast({ title: 'Payment successful! Access granted.' });
        await loadSubscriptionStatus();
      },
      onCancel: () => {
        toast({ title: 'Payment cancelled', variant: 'destructive' });
      },
    });
  }