// Paystack payment integration service

export interface PaystackPlan {
  id: string;
  name: string;
  amount: number;
  interval: string;
  features: string[];
}

export interface PaystackSubscription {
  id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  plan: PaystackPlan;
}

export interface PaystackCustomer {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

export class PaystackService {
  private baseUrl = 'https://api.paystack.co';
  private secretKey: string;

  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }

  // Initialize transaction for subscription
  async initializeSubscription(data: {
    email: string;
    amount: number;
    plan: string;
    metadata?: Record<string, any>;
  }) {
    const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: data.email,
        amount: data.amount * 100, // Convert to kobo (smallest currency unit)
        plan: data.plan,
        metadata: data.metadata,
        callback_url: `${window.location.origin}/billing/callback`,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to initialize transaction');
    }

    return response.json();
  }

  // Create subscription
  async createSubscription(data: {
    customer: string;
    plan: string;
    metadata?: Record<string, any>;
  }) {
    const response = await fetch(`${this.baseUrl}/subscription`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer: data.customer,
        plan: data.plan,
        metadata: data.metadata,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create subscription');
    }

    return response.json();
  }

  // Get subscription details
  async getSubscription(subscriptionId: string) {
    const response = await fetch(`${this.baseUrl}/subscription/${subscriptionId}`, {
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch subscription');
    }

    return response.json();
  }

  // Disable subscription
  async disableSubscription(subscriptionId: string) {
    const response = await fetch(`${this.baseUrl}/subscription/disable`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: subscriptionId,
        token: 'disable_token', // You'll need to generate this
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to disable subscription');
    }

    return response.json();
  }

  // Verify transaction
  async verifyTransaction(reference: string) {
    const response = await fetch(`${this.baseUrl}/transaction/verify/${reference}`, {
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to verify transaction');
    }

    return response.json();
  }

  // Get customer details
  async getCustomer(customerId: string) {
    const response = await fetch(`${this.baseUrl}/customer/${customerId}`, {
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch customer');
    }

    return response.json();
  }

  // Create customer
  async createCustomer(data: {
    email: string;
    first_name?: string;
    last_name?: string;
    metadata?: Record<string, any>;
  }) {
    const response = await fetch(`${this.baseUrl}/customer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to create customer');
    }

    return response.json();
  }
}

// Client-side Paystack integration (for frontend use)
export class PaystackClient {
  private publicKey: string;

  constructor(publicKey: string) {
    this.publicKey = publicKey;
  }

  // Initialize payment modal
  async initializePayment(data: {
    email: string;
    amount: number;
    reference: string;
    callback: (response: any) => void;
    onClose: () => void;
  }) {
    const handler = (window as any).PaystackPop.setup({
      key: this.publicKey,
      email: data.email,
      amount: data.amount * 100,
      reference: data.reference,
      callback: data.callback,
      onClose: data.onClose,
    });

    handler.openIframe();
  }

  // Load Paystack script
  static loadScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).PaystackPop) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Paystack script'));
      document.head.appendChild(script);
    });
  }
}

// Default plans configuration
export const DEFAULT_PLANS: PaystackPlan[] = [
  {
    id: 'free',
    name: 'Free',
    amount: 0,
    interval: 'month',
    features: [
      '5 data sources',
      '10 AI insights per month',
      'Basic analytics',
      'Email support'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    amount: 29,
    interval: 'month',
    features: [
      'Unlimited data sources',
      '100 AI insights per month',
      'Advanced analytics',
      'Priority support',
      'Custom reports',
      'Team collaboration'
    ]
  },
  {
    id: 'business',
    name: 'Business',
    amount: 99,
    interval: 'month',
    features: [
      'Unlimited data sources',
      'Unlimited AI insights',
      'Enterprise analytics',
      'Dedicated support',
      'Custom integrations',
      'Advanced team management',
      'API access'
    ]
  }
];