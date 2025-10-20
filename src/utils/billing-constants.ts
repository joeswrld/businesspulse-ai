// Billing system constants for NoteX

export const PLAN_LIMITS = {
  free: { 
    feedback: 50, 
    insights: 5, 
    reports: 5,
    retention_days: 30
  },
  pro: { 
    feedback: 300, 
    insights: 50, 
    reports: 20,
    retention_days: 365
  },
  business: { 
    feedback: -1, 
    insights: -1, 
    reports: -1, // unlimited
    retention_days: null
  },
} as const;

export const PLAN_NAMES = {
  free: 'Free Trial',
  pro: 'Pro',
  business: 'Business',
} as const;

export const PLAN_PRICES = {
  free: { amount: 0, currency: 'NGN', interval: 'trial' },
  pro: { amount: 3500000, currency: 'NGN', interval: 'monthly' }, // ₦35,000 in kobo
  business: { amount: 5300000, currency: 'NGN', interval: 'monthly' }, // ₦53,000 in kobo
} as const;

export const PLAN_CODES = {
  free: 'free',
  pro: 'PLN_4z2wpgmw41w2k7r', // Legacy - not in use
  business: 'PLN_7k87nrcofadvkfe', // Live mode business plan
} as const;

export const SUBSCRIPTION_STATUS = {
  trialing: 'trialing',
  active: 'active',
  past_due: 'past_due',
  canceled: 'canceled',
  completed: 'completed',
  attention: 'attention',
} as const;

export const USAGE_TYPES = {
  feedback: 'feedback',
  insights: 'insights',
  reports: 'reports',
} as const;

// Helper function to format price from kobo to NGN
export const formatPrice = (amountKobo: number): string => {
  const amountNGN = amountKobo / 100;
  return `₦${amountNGN.toLocaleString()}`;
};

// Helper function to check if a plan is unlimited
export const isUnlimited = (planTier: keyof typeof PLAN_LIMITS, usageType: keyof typeof USAGE_TYPES): boolean => {
  return PLAN_LIMITS[planTier][usageType] === -1;
};

// Helper function to get remaining usage
export const getRemainingUsage = (
  planTier: keyof typeof PLAN_LIMITS, 
  usageType: keyof typeof USAGE_TYPES, 
  currentUsage: number
): number | null => {
  const limit = PLAN_LIMITS[planTier][usageType];
  if (limit === -1) return null; // unlimited
  return Math.max(0, limit - currentUsage);
};

// Helper function to check if user can perform action
export const canPerformAction = (
  planTier: keyof typeof PLAN_LIMITS, 
  usageType: keyof typeof USAGE_TYPES, 
  currentUsage: number, 
  requiredAmount: number = 1
): boolean => {
  const limit = PLAN_LIMITS[planTier][usageType];
  if (limit === -1) return true; // unlimited
  return currentUsage + requiredAmount <= limit;
};

// Helper function to get trial days remaining
export const getTrialDaysRemaining = (trialEndDate: string): number => {
  const now = new Date();
  const trialEnd = new Date(trialEndDate);
  const diffTime = trialEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

// Helper function to get subscription status badge color
export const getStatusBadgeColor = (status: string): string => {
  switch (status) {
    case SUBSCRIPTION_STATUS.active:
      return 'bg-green-100 text-green-800';
    case SUBSCRIPTION_STATUS.trialing:
      return 'bg-blue-100 text-blue-800';
    case SUBSCRIPTION_STATUS.past_due:
      return 'bg-yellow-100 text-yellow-800';
    case SUBSCRIPTION_STATUS.canceled:
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Helper function to get plan features
export const getPlanFeatures = (planTier: keyof typeof PLAN_LIMITS): string[] => {
  switch (planTier) {
    case 'free':
      return [
        '50 feedback responses',
        '5 AI insights',
        '5 reports',
        '30-day data retention',
        'Basic support'
      ];
    case 'pro':
      return [
        '300 feedback responses/month',
        '50 AI insights/month',
        '20 reports/month',
        '12-month data retention',
        'Priority support',
        'Advanced analytics',
        'Team collaboration'
      ];
    case 'business':
      return [
        'Unlimited feedback responses',
        'Unlimited AI insights',
        'Unlimited reports',
        'Unlimited data retention',
        'Dedicated support',
        'Enterprise analytics',
        'Advanced team management',
        'API access',
        'Custom integrations'
      ];
    default:
      return [];
  }
};
