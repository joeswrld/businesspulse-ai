# NoteX Data Upload System Setup Guide

A complete, production-ready data upload system for NoteX that provides real-time file and text uploads with immediate AI insights generation using Gemini API.

## 🚀 Features

### **Core Functionality**
- **File Upload**: Drag-and-drop + click-to-browse for CSV, XLSX, DOCX, TXT, PDF files
- **Text Input**: Rich text area for manual data entry
- **Real-Time Updates**: Live status updates via Supabase Realtime
- **AI Analysis**: Immediate Gemini API processing after upload
- **Secure Storage**: Supabase Storage with Row Level Security
- **Mobile Responsive**: Professional design that works on all devices

### **Technical Features**
- **Supabase Integration**: Full backend with real-time subscriptions
- **Edge Functions**: Serverless AI processing
- **File Validation**: Type and size restrictions
- **Error Handling**: Comprehensive error states and user feedback
- **Progress Tracking**: Upload and processing status indicators

## 🛠️ Setup Instructions

### **1. Database Setup**

Run the SQL migration in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of:
-- supabase/migrations/20241201000001_create_upload_system.sql
```

This creates:
- `uploads` table for file and text records
- `insights` table for AI-generated insights
- `system_status` table for monitoring
- Proper indexes and RLS policies

### **2. Storage Bucket Setup**

In your Supabase Dashboard:

1. Go to **Storage** → **Buckets**
2. Click **Create a new bucket**
3. Set **Name**: `uploads`
4. Set **Public bucket**: `false` (important for security)
5. Click **Create bucket**

### **3. Edge Function Deployment**

Deploy the AI analysis function:

```bash
# Navigate to your project directory
cd your-project

# Deploy the function
supabase functions deploy analyze-upload

# Set environment variables
supabase secrets set GEMINI_ENDPOINT=your_gemini_endpoint
supabase secrets set GEMINI_KEY=your_gemini_api_key
```

### **4. Environment Variables**

Create a `.env.local` file in your project root:

```env
# Supabase (already configured)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# For Edge Function (set via supabase secrets)
GEMINI_ENDPOINT=your_gemini_endpoint
GEMINI_KEY=your_gemini_api_key
```

## 🔧 Gemini API Setup

### **Option 1: Use Google Gemini Directly**

1. Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Set `GEMINI_ENDPOINT` to: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent`
3. Set `GEMINI_KEY` to your API key

### **Option 2: Use Local Proxy (Recommended for Development)**

1. Install dependencies:
```bash
npm install express cors node-fetch
```

2. Set environment variable:
```bash
export GOOGLE_API_KEY=your_google_api_key
```

3. Run the proxy server:
```bash
node scripts/gemini-proxy.js
```

4. Set `GEMINI_ENDPOINT` to: `http://localhost:3001/gemini`

## 📱 Usage

### **File Upload**
1. Drag and drop files or click to browse
2. Supported formats: CSV, XLSX, DOCX, TXT, PDF
3. Maximum size: 10MB
4. Files are automatically analyzed by AI

### **Text Input**
1. Type or paste text in the text area
2. Click "Upload & Analyze"
3. AI processes the text immediately

### **Real-Time Updates**
- Upload status updates in real-time
- AI processing progress indicators
- Insights appear automatically when ready
- Error handling with user-friendly messages

## 🔒 Security Features

### **Row Level Security (RLS)**
- Users can only access their own uploads
- File storage is private by default
- Signed URLs for secure file access

### **File Validation**
- Type checking on both client and server
- Size limits enforced
- Malicious file prevention

### **Authentication**
- Supabase Auth integration
- Protected routes
- Session management

## 📊 Database Schema

### **uploads Table**
```sql
id: UUID (Primary Key)
user_id: UUID (References auth.users)
kind: TEXT ('file' | 'text')
filename: TEXT (for files)
mime_type: TEXT (for files)
size_bytes: BIGINT (for files)
storage_path: TEXT (for files)
text_content: TEXT (for text)
status: TEXT ('pending' | 'processing' | 'done' | 'error')
error_message: TEXT
created_at: TIMESTAMPTZ
processed_at: TIMESTAMPTZ
```

### **insights Table**
```sql
id: UUID (Primary Key)
upload_id: UUID (References uploads)
user_id: UUID (References auth.users)
summary: TEXT
details: JSONB
created_at: TIMESTAMPTZ
```

### **system_status Table**
```sql
id: UUID (Primary Key)
component: TEXT (Unique)
status: TEXT
message: TEXT
updated_at: TIMESTAMPTZ
```

## 🚀 Deployment

### **Supabase Edge Functions**
```bash
# Deploy to production
supabase functions deploy analyze-upload --project-ref your-project-ref

# Set production secrets
supabase secrets set --env-file .env.production
```

### **Frontend Deployment**
```bash
# Build for production
npm run build

# Deploy to Vercel/Netlify
# Ensure environment variables are set
```

## 🧪 Testing

### **Local Development**
1. Start your React dev server: `npm run dev`
2. Run the Gemini proxy: `node scripts/gemini-proxy.js`
3. Test file and text uploads
4. Verify real-time updates

### **Edge Function Testing**
```bash
# Test locally
supabase functions serve analyze-upload

# Test with curl
curl -X POST http://localhost:54321/functions/v1/analyze-upload \
  -H "Content-Type: application/json" \
  -d '{"upload_id":"test-id"}'
```

## 🔍 Troubleshooting

### **Common Issues**

#### **Upload Fails**
- Check file size and type
- Verify Supabase Storage bucket exists
- Check browser console for errors

#### **AI Analysis Not Working**
- Verify Edge Function is deployed
- Check environment variables
- Test Gemini API endpoint directly

#### **Real-Time Not Working**
- Ensure tables are added to realtime publication
- Check RLS policies
- Verify user authentication

### **Debug Steps**
1. Check browser console for errors
2. Verify Supabase logs in Dashboard
3. Test Edge Function locally
4. Check environment variables

## 📈 Performance Optimization

### **File Processing**
- Files are processed asynchronously
- Progress indicators for user feedback
- Efficient storage with proper indexing

### **Real-Time Updates**
- Selective subscriptions to user data
- Optimized database queries
- Minimal network overhead

### **AI Processing**
- Edge Function for serverless processing
- Structured JSON responses
- Error handling and fallbacks

## 🔮 Future Enhancements

### **Planned Features**
- **Batch Uploads**: Multiple file processing
- **Advanced File Types**: More document formats
- **Custom AI Models**: User-specific analysis
- **Export Functionality**: Download insights as reports

### **Integration Opportunities**
- **Slack Notifications**: Upload completion alerts
- **Email Reports**: Scheduled insight delivery
- **API Access**: External system integration
- **Analytics Dashboard**: Upload and insight metrics

## 📞 Support

### **Getting Help**
- **Documentation**: Check this README first
- **Issues**: Create GitHub issues for bugs
- **Discussions**: Use GitHub discussions for questions

### **Resources**
- [Supabase Documentation](https://supabase.com/docs)
- [Google Gemini API](https://ai.google.dev/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Built with ❤️ for NoteX - Your AI-Powered Business Intelligence Platform**

## 🎯 Quick Start Checklist

- [ ] Run database migration
- [ ] Create storage bucket
- [ ] Deploy Edge Function
- [ ] Set environment variables
- [ ] Test file upload
- [ ] Test text input
- [ ] Verify real-time updates
- [ ] Test AI analysis
- [ ] Deploy to production