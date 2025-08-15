# NoteX Quick Start Guide

Get NoteX running in under 10 minutes! 🚀

## ⚡ Quick Setup

### 1. Clone & Install
```bash
git clone <your-repo-url>
cd notex
npm install
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env.local

# Edit with your actual values
nano .env.local
```

**Required values:**
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key
- `VITE_GEMINI_API_KEY`: Your Google Gemini API key
- `VITE_PAYSTACK_PUBLIC_KEY`: Your Paystack public key

### 3. Database Setup
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project (replace with your project ref)
supabase link --project-ref xjbrqeqizpoqdjkiyqzt

# Push database schema
npm run db:push
```

### 4. Deploy Edge Functions
```bash
# Deploy all functions
npm run deploy:functions
```

### 5. Start Development
```bash
npm run dev
```

Visit `http://localhost:5173` 🎉

## 🔧 What Just Happened?

1. **Database**: Created all tables with proper RLS policies
2. **Storage**: Set up buckets for files and reports
3. **Functions**: Deployed AI processing and webhook handlers
4. **Real-time**: Enabled live updates across the app

## 🧪 Test the Setup

1. **Sign Up**: Create a new account
2. **Upload Data**: Try uploading a CSV or text file
3. **Watch AI**: See insights generated in real-time
4. **Dashboard**: View live updates and analytics

## 🚨 Common Issues

### "Function not found"
```bash
# Re-deploy functions
npm run deploy:functions
```

### "Database connection failed"
```bash
# Check your Supabase URL and key
# Verify project is linked
supabase status
```

### "Gemini API error"
- Verify your API key is correct
- Check API quota and billing

## 📚 Next Steps

- [Full Documentation](README.md)
- [Database Schema](supabase/migrations/)
- [Edge Functions](supabase/functions/)
- [API Reference](README.md#api-documentation)

## 🆘 Need Help?

- Check [Issues](https://github.com/your-repo/notex/issues)
- Review [Supabase Docs](https://supabase.com/docs)
- Contact the team

---

**Happy coding! 🎯**