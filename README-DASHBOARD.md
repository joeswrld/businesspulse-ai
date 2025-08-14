# NoteX Real-Time Dashboard

A production-ready, real-time dashboard for NoteX built with React, Supabase, and Tailwind CSS. This dashboard provides live business intelligence with real-time updates, AI insights, and comprehensive analytics.

## 🚀 Features

### **Real-Time Dashboard Components**
- **Welcome Header**: Personalized greeting with user's name
- **Stats Cards**: Live counts for insights, data sources, team members, and growth rate
- **Recent AI Insights**: Real-time list of latest AI-generated insights
- **AI Suggestions**: Actionable recommendations for data analysis
- **Quick Actions**: Fast access to key features
- **System Status**: Live monitoring of AI processing, data sync, and reports

### **Real-Time Capabilities**
- **Supabase Realtime**: Live updates without page refresh
- **Live Data**: All metrics update in real-time as data changes
- **User-Specific**: Data filtered by authenticated user
- **Performance Optimized**: Efficient queries with proper indexing

### **Mobile-First Design**
- **Responsive Layout**: Works perfectly on desktop, tablet, and mobile
- **Touch-Friendly**: Optimized for mobile interactions
- **Modern UI**: Clean, professional design with soft shadows and rounded corners

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Realtime + Auth)
- **UI Components**: Radix UI + shadcn/ui
- **State Management**: React Query + Supabase Realtime
- **Styling**: Tailwind CSS with custom design system

## 📊 Database Schema

### **Core Tables**
```sql
-- User profiles with plan information
profiles (id, user_id, first_name, last_name, plan, company_name, industry)

-- AI-generated insights
ai_insights (id, user_id, title, summary, insight_type, priority, created_at)

-- Data sources
data_sources (id, user_id, name, type, status, created_at)

-- Team members
team_members (id, user_id, member_email, role, created_at)

-- Reports
reports (id, user_id, title, type, status, format, created_at)

-- AI processing jobs
ai_jobs (id, user_id, job_type, status, progress, created_at)

-- Data synchronization logs
sync_logs (id, user_id, sync_type, status, last_run, created_at)

-- User subscriptions
user_subscriptions (id, user_id, plan_id, status, current_period_end)
```

## 🚀 Setup Instructions

### **1. Prerequisites**
- Node.js 18+ and npm/yarn/bun
- Supabase account and project
- Git

### **2. Clone and Install**
```bash
git clone <your-repo>
cd <your-repo>
npm install
```

### **3. Environment Configuration**
Create a `.env.local` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### **4. Database Setup**
Run the migration to create missing tables:
```bash
# Navigate to your Supabase dashboard
# Go to SQL Editor and run the migration file:
# supabase/migrations/20241201000000_create_missing_tables.sql
```

### **5. Start Development Server**
```bash
npm run dev
```

The dashboard will be available at `http://localhost:5173/dashboard`

## 🔧 Configuration

### **Supabase Setup**
1. **Enable Realtime**: Go to Database → Replication → Enable realtime for required tables
2. **Row Level Security**: All tables have RLS enabled with user-specific policies
3. **Authentication**: Uses Supabase Auth with email/password and magic links

### **Table Permissions**
```sql
-- Example RLS policy for ai_insights
CREATE POLICY "Users can view their own insights" ON ai_insights
  FOR SELECT USING (auth.uid() = user_id);
```

## 📱 Dashboard Features

### **Stats Cards**
- **Total Insights**: Live count from `ai_insights` table
- **Data Sources**: Count of connected data sources
- **Team Members**: Team count with plan-based limits
- **Growth Rate**: Month-over-month insight growth calculation

### **Real-Time Updates**
- **Insights**: New AI insights appear instantly
- **Data Sources**: Connection status updates in real-time
- **System Status**: Live monitoring of backend services

### **AI Suggestions**
- **Customer Behavior Analysis**: Upload customer data for pattern recognition
- **Sales Report Generation**: Create comprehensive sales analytics
- **Marketing Optimization**: Analyze campaign performance and ROI

### **Quick Actions**
- **Upload New Data**: Fast access to data upload flow
- **Generate Report**: Quick report generation
- **View Analytics**: Access to detailed analytics

## 🎨 Customization

### **Brand Colors**
The dashboard uses NoteX brand colors:
- **Primary**: Blue (#0066FF)
- **Font**: Inter, sans-serif
- **Style**: Clean, professional with soft shadows and rounded corners

### **Component Styling**
```tsx
// Example of custom card styling
<Card className="bg-white shadow-sm border-0">
  <CardHeader className="pb-3">
    <CardTitle className="text-sm font-medium text-gray-600">
      Card Title
    </CardTitle>
  </CardHeader>
</Card>
```

### **Responsive Breakpoints**
- **Mobile**: `grid-cols-1` (single column)
- **Tablet**: `md:grid-cols-2` (two columns)
- **Desktop**: `lg:grid-cols-4` (four columns)

## 🔒 Security Features

### **Authentication**
- **Protected Routes**: Dashboard requires authentication
- **User Isolation**: Data is filtered by `user_id`
- **Session Management**: Automatic token refresh

### **Data Protection**
- **Row Level Security**: Database-level user isolation
- **API Security**: Supabase policies enforce access control
- **Input Validation**: TypeScript interfaces ensure data integrity

## 📈 Performance Optimization

### **Real-Time Efficiency**
- **Selective Subscriptions**: Only subscribe to user-specific data
- **Optimized Queries**: Efficient database queries with proper indexing
- **Debounced Updates**: Prevents excessive re-renders

### **Loading States**
- **Skeleton Loading**: Shows loading placeholders
- **Progressive Loading**: Loads data incrementally
- **Error Handling**: Graceful fallbacks for failed requests

## 🧪 Testing

### **Component Testing**
```bash
npm run test
```

### **E2E Testing**
```bash
npm run test:e2e
```

## 🚀 Deployment

### **Build for Production**
```bash
npm run build
```

### **Deploy to Vercel/Netlify**
1. Connect your repository
2. Set environment variables
3. Deploy automatically on push

### **Supabase Production**
1. **Database**: Use production Supabase instance
2. **Realtime**: Ensure realtime is enabled
3. **Policies**: Verify RLS policies are active

## 📊 Monitoring and Analytics

### **Performance Metrics**
- **Page Load Time**: Optimized for fast loading
- **Real-Time Updates**: Sub-second data refresh
- **Error Tracking**: Comprehensive error handling

### **User Analytics**
- **Page Views**: Track dashboard usage
- **Feature Usage**: Monitor which features are most used
- **Performance**: Monitor real-time update performance

## 🔮 Future Enhancements

### **Planned Features**
- **Advanced Analytics**: More detailed charts and graphs
- **Custom Dashboards**: User-configurable layouts
- **Export Functionality**: PDF/Excel report export
- **Notification System**: Real-time alerts and notifications

### **Integration Opportunities**
- **Slack/Teams**: Send insights to team channels
- **Email Reports**: Scheduled report delivery
- **API Access**: External system integration

## 🤝 Contributing

### **Development Workflow**
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### **Code Standards**
- **TypeScript**: Strict type checking enabled
- **ESLint**: Code quality enforcement
- **Prettier**: Consistent code formatting
- **Component Structure**: Follow established patterns

## 📞 Support

### **Getting Help**
- **Documentation**: Check this README first
- **Issues**: Create GitHub issues for bugs
- **Discussions**: Use GitHub discussions for questions

### **Common Issues**
- **Real-time not working**: Check Supabase realtime settings
- **Authentication errors**: Verify environment variables
- **Database errors**: Check table permissions and RLS policies

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Built with ❤️ for NoteX - Your AI-Powered Business Intelligence Platform**