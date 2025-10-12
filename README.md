# NoteX - AI-Powered Feedback Management Platform

A complete feedback management system with subscription-based access control, built with React, TypeScript, Supabase, and Paystack.

## 🚀 Features

- **8-Day Free Trial** - New users get full access for 8 days
- **Subscription Management** - Paystack integration for payments
- **Real-time Feedback** - Live updates using Supabase Realtime
- **AI-Powered Insights** - Google Gemini integration for sentiment analysis
- **Team Collaboration** - Multi-user workspace management
- **Widget Integration** - Easy-to-install feedback widget
- **Advanced Analytics** - Detailed reports and insights
- **Responsive Design** - Works on all devices

## 🛠 Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Backend**: Supabase (Postgres + Realtime + Auth + RLS)
- **Payments**: Paystack Subscriptions
- **AI**: Google Gemini API
- **Deployment**: Vercel

## 📋 Prerequisites

- Node.js 18+ 
- Supabase account
- Paystack account
- Google Gemini API key

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd notex-feedback-platform
npm install
```

### 2. Environment Setup

Create `.env.local` file:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Paystack Configuration
VITE_PAYSTACK_PUBLIC_KEY=your_paystack_public_key
VITE_PAYSTACK_PLAN_CODE=your_paystack_plan_code

# Google Gemini AI
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### 3. Database Setup

1. Create a new Supabase project
2. Run the SQL from `supabase-schema.sql` in your Supabase SQL editor
3. Enable Row Level Security (RLS) on all tables

### 4. Paystack Setup

1. Create a Paystack account
2. Create a subscription plan
3. Get your public key and plan code
4. Set up webhook endpoint: `https://yourdomain.com/api/webhooks/paystack`

### 5. Google Gemini Setup

1. Get API key from Google AI Studio
2. Add to environment variables

### 6. Run Development Server

```bash
npm run dev
```

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ProtectedRoute.tsx
│   ├── AccessLocked.tsx
│   ├── Navbar.tsx
│   └── TrialCountdown.tsx
├── hooks/              # Custom React hooks
│   ├── useAuth.ts
│   └── useSubscriptionStatus.ts
├── lib/                # Utility libraries
│   ├── supabase.ts
│   └── gemini.ts
├── pages/              # Page components
│   ├── DashboardPage.tsx
│   ├── FeedbackPage.tsx
│   ├── InsightsPage.tsx
│   ├── ReportsPage.tsx
│   ├── TeamPage.tsx
│   ├── SettingsPage.tsx
│   ├── BillingPage.tsx
│   ├── LoginPage.tsx
│   └── SignupPage.tsx
├── App.tsx             # Main app component
└── main.tsx           # Entry point

api/                    # API endpoints
├── webhooks/
│   └── paystack.ts    # Paystack webhook handler
└── feedback.ts        # Feedback submission API

public/
└── widget.js          # Feedback widget script
```

## 🔐 Authentication & Authorization

- **Supabase Auth** for user authentication
- **Row Level Security (RLS)** for data protection
- **Protected Routes** based on subscription status
- **Trial System** with automatic expiration

## 💳 Subscription System

### Trial Flow
1. User signs up → Gets 8-day trial
2. Full access to all features during trial
3. Trial countdown shown in navbar
4. Access locked after trial expires

### Payment Flow
1. User clicks "Upgrade to Pro" on billing page
2. Paystack modal opens for payment
3. Payment success → Webhook updates subscription status
4. User gets immediate access to all features

### Access Control
- **Trial Users**: Full access until expiration
- **Paid Users**: Full access forever
- **Expired Users**: Only billing and account pages
- **Failed Payment**: Features locked, payment update prompt

## 🤖 AI Integration

The system uses Google Gemini to analyze feedback:

- **Sentiment Analysis**: Positive, neutral, negative
- **Auto-summarization**: Brief summary of feedback
- **Suggested Replies**: Professional response suggestions
- **Tag Extraction**: Automatic categorization

## 📊 Analytics & Reporting

- **Real-time Dashboard**: Live feedback updates
- **Sentiment Analysis**: Visual breakdown of feedback sentiment
- **Type Classification**: Bug reports, feature requests, praise
- **Export Options**: CSV and JSON export
- **Team Activity**: Track team member actions

## 🔧 Widget Integration

Easy-to-install feedback widget:

```html
<script>
  (function() {
    var notex = document.createElement('script');
    notex.type = 'text/javascript';
    notex.async = true;
    notex.src = 'https://yourdomain.com/widget.js';
    notex.setAttribute('data-workspace', 'your-workspace-slug');
    notex.setAttribute('data-color', '#3B82F6');
    notex.setAttribute('data-greeting', 'How can we help you today?');
    notex.setAttribute('data-position', 'bottom-right');
    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(notex, s);
  })();
</script>
```

## 🚀 Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables for Production

```bash
# Supabase
SUPABASE_URL=your_production_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Paystack
PAYSTACK_SECRET_KEY=your_paystack_secret_key
PAYSTACK_PLAN_CODE=your_plan_code

# Gemini
GEMINI_API_KEY=your_gemini_api_key
```

## 🔒 Security Features

- **Row Level Security (RLS)** on all database tables
- **Webhook signature verification** for Paystack
- **Input validation** and sanitization
- **Rate limiting** on API endpoints
- **Secure environment variable handling**

## 📱 Responsive Design

- Mobile-first approach
- Tailwind CSS for styling
- Responsive navigation
- Touch-friendly interface

## 🧪 Testing

```bash
# Run linting
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, email support@notex.com or create an issue in the repository.

---

**NoteX** - Transform customer feedback into actionable insights with AI-powered analysis and real-time collaboration.