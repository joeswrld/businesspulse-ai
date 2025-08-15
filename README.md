# NoteX - AI-Powered Business Intelligence Platform

NoteX transforms your company data into actionable, quantified insights in real-time using AI, vector search, and real-time analytics.

## 🚀 Features

- **Real-time AI Insights**: Instant analysis of uploaded data using Gemini API
- **Vector Search**: Semantic search across documents using pgvector
- **Live Dashboard**: Real-time updates via Supabase Realtime
- **Multi-format Support**: CSV, XLSX, PDF, DOCX, TXT, and API sources
- **Team Collaboration**: Shared insights and action plans
- **Advanced Analytics**: Trend analysis and business intelligence
- **Paystack Integration**: Seamless subscription management
- **Production Ready**: Built with security, scalability, and performance in mind

## 🏗️ Architecture

- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (Auth, Database, Storage, Realtime, Edge Functions)
- **AI Engine**: Google Gemini API for insights generation
- **Vector Search**: pgvector extension in Supabase
- **Billing**: Paystack for subscription management
- **Real-time**: Supabase Realtime for live updates

## 📋 Prerequisites

- Node.js 18+ and npm/yarn
- Supabase account and project
- Google Gemini API key
- Paystack account and API keys
- Git

## 🛠️ Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd notex
npm install
```

### 2. Environment Configuration

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Gemini API
VITE_GEMINI_API_KEY=your-gemini-api-key

# Paystack Configuration
VITE_PAYSTACK_PUBLIC_KEY=your-paystack-public-key
```

### 3. Supabase Setup

#### 3.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down your project URL and anon key

#### 3.2 Run Database Migrations

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

#### 3.3 Configure Storage Buckets

The migrations will automatically create the required storage buckets:
- `data-files`: For uploaded documents
- `reports`: For generated reports

#### 3.4 Set Environment Variables in Supabase

Go to your Supabase project dashboard → Settings → Edge Functions and set:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
PAYSTACK_SECRET_KEY=your-paystack-secret-key
PAYSTACK_PUBLIC_KEY=your-paystack-public-key
```

### 4. Deploy Edge Functions

```bash
# Deploy all Edge Functions
supabase functions deploy

# Or deploy individually
supabase functions deploy process-upload
supabase functions deploy generate-report
supabase functions deploy paystack-webhook
```

### 5. Configure Paystack Webhooks

1. Go to your Paystack dashboard → Settings → Webhooks
2. Add webhook URL: `https://your-project.supabase.co/functions/v1/paystack-webhook`
3. Select events: `charge.success`, `subscription.create`, `subscription.update`, `subscription.disable`, `invoice.payment_failed`

### 6. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` to see your application.

## 🗄️ Database Schema

The application uses the following core tables:

- **`data_sources`**: Uploaded files and data sources
- **`normalized_docs`**: Processed and cleaned documents
- **`doc_chunks`**: Document chunks with vector embeddings
- **`ai_insights`**: Generated AI insights and recommendations
- **`ai_insights_feedback`**: User feedback on insights
- **`action_plans`**: Action plans created from insights
- **`analytics_daily`**: Daily aggregated analytics
- **`user_subscriptions`**: User subscription status
- **`paystack_webhooks`**: Webhook event tracking

## 🔐 Security Features

- **Row Level Security (RLS)**: All data is scoped to user's team
- **JWT Authentication**: Secure user sessions via Supabase Auth
- **Signed URLs**: Secure file access with expiration
- **Webhook Verification**: Paystack webhook signature validation
- **Least Privilege**: Minimal required permissions for each operation

## 📊 AI Pipeline

1. **Data Upload**: Files uploaded to Supabase Storage
2. **Processing**: Edge Function processes and normalizes content
3. **Chunking**: Content split into semantic chunks
4. **Embeddings**: Vector embeddings generated using Gemini
5. **Insight Generation**: AI analyzes content and generates insights
6. **Real-time Updates**: UI updates instantly via Supabase Realtime

## 🚀 Production Deployment

### Vercel Deployment

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

### Environment Variables for Production

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GEMINI_API_KEY=your-gemini-api-key
VITE_PAYSTACK_PUBLIC_KEY=your-paystack-public-key
```

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Project Structure

```
src/
├── components/       # Reusable UI components
├── pages/           # Application pages
├── contexts/        # React contexts
├── hooks/           # Custom React hooks
├── lib/             # Utility libraries and services
├── integrations/    # Third-party integrations
└── assets/          # Static assets

supabase/
├── functions/       # Edge Functions
├── migrations/      # Database migrations
└── config.toml     # Supabase configuration
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 📝 API Documentation

### Edge Functions

- **`/api/process-upload`**: Process uploaded files and generate insights
- **`/api/generate-report`**: Generate PDF/CSV reports from insights
- **`/api/paystack-webhook`**: Handle Paystack webhook events

### Authentication

All protected routes require valid JWT tokens from Supabase Auth.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:

1. Check the [Issues](https://github.com/your-repo/notex/issues) page
2. Create a new issue with detailed description
3. Contact the development team

## 🔄 Updates and Maintenance

- **Regular Updates**: Keep dependencies updated
- **Security Patches**: Monitor for security updates
- **Performance Monitoring**: Use Supabase dashboard for monitoring
- **Backup**: Regular database backups via Supabase

---

Built with ❤️ using modern web technologies and AI capabilities.
