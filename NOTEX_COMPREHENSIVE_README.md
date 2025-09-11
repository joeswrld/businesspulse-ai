# 🚀 NoteX - Comprehensive SaaS Platform

A complete, production-ready feedback collection and analytics platform built with React, TypeScript, Supabase, and Paystack integration.

## 📋 Overview

NoteX is a comprehensive SaaS platform that provides:

- **8-day free trial** with automatic expiry
- **Business subscription** via Paystack ($29/month)
- **Unique project IDs** for widget embedding
- **Real-time feedback collection** with AI insights
- **Team collaboration** features
- **Advanced analytics** and reporting
- **Secure authentication** with Supabase Auth
- **Row-level security** for data protection

## 🏗️ Architecture

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Radix UI** components
- **React Router** for navigation
- **TanStack Query** for data fetching

### Backend
- **Supabase** (PostgreSQL + Auth + Realtime)
- **Edge Functions** for API endpoints
- **Row Level Security** (RLS) policies
- **Database triggers** for automation

### Payment Processing
- **Paystack** integration
- **Webhook handling** for subscription management
- **Automatic trial expiry**

### Widget System
- **Embeddable JavaScript widget**
- **Unique project ID validation**
- **Secure configuration API**
- **Real-time feedback submission**

## 🗄️ Database Schema

### Core Tables

#### `profiles`
- User profile information
- Trial and subscription status
- Paystack customer integration

#### `projects`
- Unique project IDs for widgets
- User ownership and settings
- UNIQUE constraint on `project_id`

#### `subscriptions`
- Paystack subscription data
- Billing period tracking
- Status management

#### `feedbacks`
- Client feedback storage
- Sentiment analysis
- Project association

### Security Features
- **Row Level Security** on all tables
- **User ownership** enforcement
- **Unique project ID** validation
- **Secure API endpoints**

## 🔐 Authentication Flow

### Sign Up
1. User registers with email + password
2. Profile created automatically with 8-day trial
3. Email confirmation required
4. Redirect to dashboard

### Login
1. Standard Supabase authentication
2. Profile validation
3. Access check (trial/subscription status)
4. Redirect to dashboard

### Password Reset
1. Email-based reset flow
2. Secure token validation
3. Password update

## 💳 Billing System

### Trial System
- **8-day free trial** on signup
- **Automatic expiry** via cron job
- **Plan status tracking** (`trialing` → `expired`)

### Subscription Management
- **Paystack integration** for payments
- **Webhook handling** for status updates
- **Automatic plan activation**
- **Subscription cancellation** support

### Plan Features
- **Trial**: Limited access, 8 days
- **Business**: Unlimited access, $29/month
- **Expired**: Only billing/profile pages accessible

## 🎯 Widget System

### Project Management
- **Unique project IDs** (4-30 chars, lowercase, numbers, hyphens)
- **Database-level uniqueness** enforcement
- **User ownership** validation
- **Settings management**

### Embed Code
```html
<script src="https://notex.com.ng/feedback-widget.js" data-project-id="your-project-id"></script>
```

### Widget Features
- **Responsive design**
- **Customizable appearance**
- **Email collection** (optional)
- **File uploads** (optional)
- **Analytics tracking**
- **Auto-open** functionality

## 🛡️ Security Features

### Row Level Security (RLS)
- Users can only access their own data
- Project ownership enforcement
- Secure API endpoints

### API Security
- **HMAC signature verification** for Paystack webhooks
- **Service role key** for sensitive operations
- **Input validation** and sanitization

### Data Protection
- **Encrypted data transmission**
- **Secure session management**
- **Privacy-compliant** data handling

## 📱 User Interface

### Navigation
- **Sidebar navigation** with locking behavior
- **Plan status indicators**
- **Trial countdown** display
- **Upgrade prompts** for expired users

### Pages
- **Landing Page**: Public marketing site
- **Dashboard**: Overview and metrics
- **Feedback**: Real-time feedback stream
- **AI Insights**: AI-powered analytics
- **Reports**: Export and analytics
- **Business Metrics**: Advanced charts
- **Team**: Collaboration features
- **Billing**: Subscription management
- **Widget Settings**: Project management
- **Profile**: Account settings

### Locking Behavior
- **Expired users**: Only billing/profile accessible
- **Visual indicators**: Locked features greyed out
- **Upgrade prompts**: Clear call-to-action

## 🚀 Deployment

### Prerequisites
- Node.js 18+
- Supabase CLI
- Paystack account
- Domain for widget hosting

### Quick Start
```bash
# Clone the repository
git clone <repository-url>
cd notex-platform

# Install dependencies
npm install

# Set up Supabase
supabase init
supabase start

# Deploy the platform
./deploy-comprehensive-notex.sh
```

### Environment Variables
```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Paystack Configuration
VITE_PAYSTACK_PUBLIC_KEY=your_paystack_public_key
PAYSTACK_SECRET_KEY=your_paystack_secret_key

# NoteX Configuration
VITE_APP_URL=https://notex.com.ng
```

### Database Migration
The comprehensive schema is applied via:
```sql
-- See: supabase/migrations/20250126000000_comprehensive_notex_schema.sql
```

### Edge Functions Deployment
```bash
# Deploy all functions
supabase functions deploy paystack-webhook
supabase functions deploy widget-config
supabase functions deploy submit-feedback
```

## 🔧 Configuration

### Paystack Setup
1. Create Paystack account
2. Get API keys
3. Set up webhook URL: `https://your-project.supabase.co/functions/v1/paystack-webhook`
4. Create business plan in Paystack dashboard

### Supabase Setup
1. Create Supabase project
2. Enable Auth with email confirmation
3. Set up RLS policies
4. Configure storage buckets

### Domain Configuration
1. Set up custom domain
2. Configure SSL certificate
3. Update CORS settings
4. Deploy widget script

## 📊 Monitoring & Analytics

### Built-in Analytics
- **User registration** tracking
- **Trial conversion** metrics
- **Subscription status** monitoring
- **Widget usage** analytics

### Error Monitoring
- **Frontend error** tracking
- **API error** logging
- **Database error** monitoring
- **Payment failure** alerts

### Performance Monitoring
- **Page load** times
- **API response** times
- **Database query** performance
- **Widget load** times

## 🧪 Testing

### Test Scenarios
1. **User Registration**: Sign up → profile creation → trial start
2. **Trial Expiry**: Automatic expiry → access restriction
3. **Subscription**: Paystack payment → plan activation
4. **Widget Embed**: Project creation → embed code → feedback collection
5. **Security**: RLS enforcement → unauthorized access prevention

### Test Data
```sql
-- Create test user
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
VALUES ('test-user-id', 'test@notex.com', 'encrypted-password', NOW());

-- Create test profile
INSERT INTO public.profiles (id, email, full_name, plan_status, trial_start_date, trial_expiry_date)
VALUES ('test-user-id', 'test@notex.com', 'Test User', 'trialing', NOW(), NOW() + INTERVAL '8 days');
```

## 🔄 Maintenance

### Daily Tasks
- **Trial expiry** automation (cron job)
- **Subscription status** sync
- **Error monitoring** review

### Weekly Tasks
- **Performance metrics** review
- **User feedback** analysis
- **Security audit** check

### Monthly Tasks
- **Database optimization**
- **Backup verification**
- **Security updates**

## 🆘 Troubleshooting

### Common Issues

#### Authentication Problems
- Check Supabase Auth configuration
- Verify email confirmation settings
- Review RLS policies

#### Payment Issues
- Verify Paystack webhook URL
- Check API key configuration
- Review webhook signature validation

#### Widget Problems
- Check project ID uniqueness
- Verify API endpoint accessibility
- Review CORS settings

#### Database Errors
- Check RLS policy configuration
- Verify foreign key constraints
- Review trigger functions

### Debug Mode
Enable debug logging:
```javascript
// In browser console
localStorage.setItem('notex-debug', 'true');
```

### Support
- **Documentation**: This README
- **Issues**: GitHub Issues
- **Contact**: support@notex.com

## 📈 Roadmap

### Phase 1 (Current)
- ✅ Core platform functionality
- ✅ Trial and billing system
- ✅ Widget embedding
- ✅ Basic analytics

### Phase 2 (Next)
- 🔄 Advanced AI insights
- 🔄 Team collaboration features
- 🔄 Advanced reporting
- 🔄 Mobile app

### Phase 3 (Future)
- 📋 Enterprise features
- 📋 White-label options
- 📋 Advanced integrations
- 📋 Global expansion

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

For support and questions:
- **Email**: support@notex.com
- **Documentation**: [docs.notex.com](https://docs.notex.com)
- **Community**: [community.notex.com](https://community.notex.com)

---

**NoteX** - Collect feedback, gain insights, grow your business. 🚀