import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useBillingSystem, 
  getPlanLimits, 
  formatCurrency, 
  formatDate, 
  getPlanDisplayName, 
  getPlanPrice, 
  getPlanPricing 
} from '@/hooks/useBillingSystem';
import { useUnifiedTrial } from '@/contexts/UnifiedTrialContext';

import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Download, CalendarDays, Timer, Crown, DollarSign, Activity, 
  CheckCircle, XCircle, AlertTriangle, Clock, Loader2, RefreshCw, 
  Receipt, Lock, X
} from 'lucide-react';
import PaystackPayment from '@/components/PaystackPayment';
import PlanComparison from '@/components/billing/PlanComparison';

type UpgradePlan = 'business' | null;

// ✅ Helper: Calculate subscription end date
const calculateSubscriptionEndDate = (billingProfile: any, currentPlan: string) => {
  if (currentPlan === 'trial' && billingProfile?.trial_ends_at) {
    return new Date(billingProfile.trial_ends_at);
  }
  if (billingProfile?.next_billing_date) {
    return new Date(billingProfile.next_billing_date);
  }
  return null;
};

// ✅ Helper: Subscription status UI
const getSubscriptionStatusDisplay = (
  billingProfile: any, 
  currentPlan: string, 
  isTrialExpired: boolean, 
  isPaymentPastDue: boolean, 
  isInGracePeriod: boolean
) => {
  if (currentPlan === 'trial') {
    return isTrialExpired
      ? { color: 'bg-red-50 text-red-700 border-red-200', icon: <XCircle className="h-4 w-4" />, label: 'Trial Expired', description: 'Your free trial has ended' }
      : { color: 'bg-blue-50 text-blue-700 border-blue-200', icon: <Clock className="h-4 w-4" />, label: 'Free Trial', description: 'Enjoying your free trial' };
  }
  if (isPaymentPastDue) {
    return isInGracePeriod
      ? { color: 'bg-orange-50 text-orange-700 border-orange-200', icon: <AlertTriangle className="h-4 w-4" />, label: 'Payment Due', description: 'Payment failed - grace period active' }
      : { color: 'bg-red-50 text-red-700 border-red-200', icon: <XCircle className="h-4 w-4" />, label: 'Payment Failed', description: 'Account suspended due to failed payment' };
  }
  if (billingProfile?.subscription_status === 'active') {
    return { color: 'bg-green-50 text-green-700 border-green-200', icon: <CheckCircle className="h-4 w-4" />, label: 'Active', description: 'Subscription is active and up to date' };
  }
  return { color: 'bg-gray-50 text-gray-700 border-gray-200', icon: <Clock className="h-4 w-4" />, label: 'Inactive', description: 'No active subscription' };
};

const BillingPage: React.FC = () => {
  const { user } = useAuth();

  // ✅ Fixed: Only one `useUnifiedTrial`
  const { trialStatus, refreshTrialStatus, upgradeToBusiness, getDaysLeft, isTrialExpired } = useUnifiedTrial();

  const {
    billingProfile,
    transactions,
    loading,
    error,
    refreshing,
    currentPlan,
    isPaymentPastDue,
    isInGracePeriod,
    gracePeriodDaysLeft,
    refreshData,
    cancelSubscription,
  } = useBillingSystem();

  const [cancelling, setCancelling] = useState(false);
  const [upgradePlanModal, setUpgradePlanModal] = useState<UpgradePlan>(null);

  // ✅ Cancel subscription
  const handleCancelSubscription = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to cancel your subscription?\n\n' +
      'You will continue to have access to your current plan until the end of your billing period.\n\n' +
      'This action cannot be undone.'
    );
    if (!confirmed) return;

    setCancelling(true);
    try {
      await cancelSubscription();
      toast.success('Subscription cancelled');
    } catch (error) {
      console.error(error);
      toast.error('Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  // ✅ Upgrade modal handler
  const handleUpgradeClick = (plan: UpgradePlan) => {
    const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    if (!paystackKey || paystackKey.includes('pk_test_...') || paystackKey.includes('your_actual_paystack')) {
      toast.error('Paystack is not configured. Set your VITE_PAYSTACK_PUBLIC_KEY.');
      return;
    }
    setUpgradePlanModal(plan);
  };

  // ✅ Download receipt
  const downloadReceipt = (transaction: any) => {
    try {
      const receiptContent = `
NoteX - Transaction Receipt
Date: ${formatDate(transaction.created_at)}
Description: ${transaction.description || 'Subscription Payment'}
Amount: ${formatCurrency(transaction.amount, transaction.currency)}
Status: ${transaction.status}
Reference: ${transaction.paystack_reference || 'N/A'}
Transaction ID: ${transaction.id}
      `.trim();

      const blob = new Blob([receiptContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt-${transaction.id}.txt`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success('Receipt downloaded');
    } catch (error) {
      toast.error('Failed to download receipt');
    }
  };

  // ✅ UI state
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md text-center p-6">
          <Lock className="h-12 w-12 mx-auto mb-4 text-gray-500" />
          <CardTitle>Authentication Required</CardTitle>
          <CardDescription>Please log in to view your billing information.</CardDescription>
        </Card>
      </div>
    );
  }

  if (loading) return <div className="p-8">Loading billing info...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  const statusDisplay = getSubscriptionStatusDisplay(billingProfile, currentPlan, isTrialExpired(), isPaymentPastDue, isInGracePeriod);
  const planPricing = getPlanPricing(currentPlan);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Billing & Subscription</h1>

      {/* Current Plan */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{getPlanDisplayName(currentPlan)}</CardTitle>
          <CardDescription>{statusDisplay.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Badge className={`${statusDisplay.color} flex items-center gap-1`}>
            {statusDisplay.icon}
            {statusDisplay.label}
          </Badge>

          <div className="mt-4 flex gap-2">
            {trialStatus.plan === 'free_trial' && !isTrialExpired() && (
              <Button onClick={() => handleUpgradeClick('business')}>
                <Crown className="mr-2 h-4 w-4" /> Upgrade to Business
              </Button>
            )}

            {trialStatus.plan === 'business' && trialStatus.subscriptionActive && (
              <Button 
                variant="outline" 
                onClick={handleCancelSubscription} 
                disabled={cancelling}
              >
                {cancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                Cancel Subscription
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>All your past payments</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-gray-600">No transactions yet.</p>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className="flex justify-between border-b py-2">
                <div>
                  <p className="font-medium">{tx.description || 'Payment'}</p>
                  <p className="text-sm text-gray-500">{formatDate(tx.created_at)}</p>
                </div>
                <div className="flex gap-3 items-center">
                  <span className="font-bold">{formatCurrency(tx.amount, tx.currency)}</span>
                  <Button size="sm" onClick={() => downloadReceipt(tx)} disabled={tx.status !== 'success'}>
                    <Download className="h-4 w-4 mr-1" /> Receipt
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Upgrade Modal */}
      {upgradePlanModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg">
            <PaystackPayment
              plan={upgradePlanModal}
              planName="Business"
              planPrice={getPlanPrice(upgradePlanModal)}
              onSuccess={async () => {
                toast.success('Welcome to Business! 🎉');
                setUpgradePlanModal(null);
                await upgradeToBusiness();
                await refreshData();
              }}
              onCancel={() => setUpgradePlanModal(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingPage;
