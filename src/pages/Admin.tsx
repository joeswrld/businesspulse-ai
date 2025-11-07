import React, { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, DollarSign, MessageSquare, Zap, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Settings, Menu, X, Search, Filter, Download, Mail, Shield, FileText, Activity, BarChart3, Sparkles, FlaskConical, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// ===========================
// STAT CARD COMPONENT
// ===========================
const StatCard = ({ title, value, change, trend, icon: Icon, color = 'blue', loading = false }: {
  title: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down';
  icon: any;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'pink';
  loading?: boolean;
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    pink: 'bg-pink-50 text-pink-600'
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-12 bg-gray-200 rounded mb-4"></div>
        <div className="h-4 bg-gray-200 rounded mb-2"></div>
        <div className="h-8 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`${colorClasses[color]} p-3 rounded-lg`}>
          <Icon size={24} />
        </div>
        {change !== undefined && (
          <div className={`flex items-center ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
            {trend === 'up' && <TrendingUp size={16} />}
            {trend === 'down' && <TrendingDown size={16} />}
            <span className="ml-1 text-sm font-semibold">{change}%</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-gray-500 text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
    </div>
  );
};

// ===========================
// ALERT BANNER COMPONENT
// ===========================
const AlertBanner = ({ severity, message, count, onClick }) => {
  const severityClasses = {
    critical: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  return (
    <div className={`${severityClasses[severity]} border rounded-lg p-4 flex items-center justify-between`}>
      <div className="flex items-center">
        <AlertTriangle size={20} className="mr-3" />
        <span className="font-medium">{message}</span>
        {count > 0 && <span className="ml-2 bg-white px-2 py-1 rounded text-sm font-bold">{count}</span>}
      </div>
      {onClick && (
        <button onClick={onClick} className="underline text-sm font-semibold hover:no-underline">
          View Details →
        </button>
      )}
    </div>
  );
};

// ===========================
// DATA TABLE COMPONENT
// ===========================
const DataTable = ({ columns, data, title, loading = false, onExport }) => {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredData = data.filter(row =>
    Object.values(row).some(val =>
      val?.toString().toLowerCase().includes(search.toLowerCase())
    )
  );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-8 bg-gray-200 rounded mb-4 animate-pulse"></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <div className="flex gap-2">
            <button className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center">
              <Filter size={16} className="mr-2" />
              Filter
            </button>
            <button 
              onClick={onExport}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
            >
              <Download size={16} className="mr-2" />
              Export CSV
            </button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {col.label || col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                  No data found
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  {columns.map((col, i) => {
                    const key = col.key || col.toLowerCase().replace(/ /g, '_');
                    const value = row[key];
                    return (
                      <td key={i} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {col.render ? col.render(value, row) : value || '-'}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {paginatedData.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} results
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

// ===========================
// MAIN DASHBOARD COMPONENT
// ===========================
const NoteXAdminDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    totalUsers: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
    totalFeedback: 0,
    feedbackLast24h: 0,
    totalProjects: 0,
    totalInsights: 0,
    recentTransactions: [],
    users: [],
    feedback: [],
    subscriptions: [],
    projects: [],
    feedbackSettings: []
  });

  // Fetch all data on mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch all counts and data in parallel
      const [
        profilesRes,
        billingRes,
        feedbackRes,
        transactionsRes,
        projectsRes,
        insightsRes,
        feedbackSettingsRes
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact' }),
        supabase.from('billing_profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('feedback').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(100),
        supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('projects').select('*', { count: 'exact' }),
        supabase.from('insights').select('*', { count: 'exact' }),
        supabase.from('feedback_settings').select('*')
      ]);

      // Calculate metrics
      const totalRevenue = transactionsRes.data?.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0) || 0;
      const activeSubscriptions = billingRes.data?.filter(b => b.subscription_status === 'active').length || 0;
      const last24hFeedback = feedbackRes.data?.filter(f => {
        const created = new Date(f.created_at);
        const now = new Date();
        return (now.getTime() - created.getTime()) / (1000 * 60 * 60) <= 24;
      }).length || 0;

      setDashboardData({
        totalUsers: profilesRes.count || 0,
        activeSubscriptions,
        totalRevenue,
        totalFeedback: feedbackRes.count || 0,
        feedbackLast24h: last24hFeedback,
        totalProjects: projectsRes.count || 0,
        totalInsights: insightsRes.count || 0,
        users: profilesRes.data || [],
        subscriptions: billingRes.data || [],
        feedback: feedbackRes.data || [],
        recentTransactions: transactionsRes.data || [],
        projects: projectsRes.data || [],
        feedbackSettings: feedbackSettingsRes.data || []
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
    setLoading(false);
  };

  // Export to CSV function
  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
      alert('No data to export');
      return;
    }
    
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => JSON.stringify(row[h] || '')).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'billing', label: 'Subscriptions & Billing', icon: DollarSign },
    { id: 'feedback', label: 'Feedback Overview', icon: MessageSquare },
    { id: 'projects', label: 'Projects', icon: Settings },
    { id: 'insights', label: 'Insights', icon: Sparkles },
    { id: 'transactions', label: 'Transactions', icon: Activity },
    { id: 'analytics', label: 'Analytics & Metrics', icon: TrendingUp }
  ];

  // ===========================
  // OVERVIEW VIEW
  // ===========================
  const OverviewView = () => {
    // Generate chart data from real data
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0];
    });

    const feedbackByDay = last30Days.map(date => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: dashboardData.feedback.filter(f => f.created_at?.startsWith(date)).length
    }));

    const subscriptionStatus = [
      { name: 'Active', value: dashboardData.subscriptions.filter(s => s.subscription_status === 'active').length, color: '#10b981' },
      { name: 'Trial', value: dashboardData.subscriptions.filter(s => s.subscription_status === 'trialing').length, color: '#f59e0b' },
      { name: 'Expired', value: dashboardData.subscriptions.filter(s => s.subscription_status === 'expired' || s.subscription_status === 'canceled').length, color: '#ef4444' }
    ];

    const revenueByDay = last30Days.map(date => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: dashboardData.recentTransactions
        .filter(t => t.created_at?.startsWith(date))
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0)
    }));

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Platform Overview</h2>
            <p className="text-gray-600">Real-time insights into your NoteX platform performance</p>
          </div>
          <button 
            onClick={fetchDashboardData}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw size={16} />
            Refresh Data
          </button>
        </div>

        {/* Hero Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Users"
            value={dashboardData.totalUsers.toLocaleString()}
            icon={Users}
            color="blue"
            loading={loading}
          />
          <StatCard
            title="Active Subscriptions"
            value={`${dashboardData.activeSubscriptions} / ${dashboardData.subscriptions.length}`}
            icon={DollarSign}
            color="green"
            loading={loading}
          />
          <StatCard
            title="Feedback (24h)"
            value={dashboardData.feedbackLast24h?.toLocaleString() || '0'}
            icon={MessageSquare}
            color="purple"
            loading={loading}
          />
          <StatCard
            title="Total Projects"
            value={dashboardData.totalProjects.toLocaleString()}
            icon={Settings}
            color="orange"
            loading={loading}
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Total Revenue"
            value={`₦${dashboardData.totalRevenue.toLocaleString()}`}
            icon={DollarSign}
            color="green"
            loading={loading}
          />
          <StatCard
            title="Total Feedback"
            value={dashboardData.totalFeedback.toLocaleString()}
            icon={MessageSquare}
            color="purple"
            loading={loading}
          />
          <StatCard
            title="Total Insights"
            value={dashboardData.totalInsights.toLocaleString()}
            icon={Sparkles}
            color="pink"
            loading={loading}
          />
        </div>

        {/* Alerts */}
        {dashboardData.subscriptions.filter(s => s.subscription_status === 'expired').length > 0 && (
          <AlertBanner
            severity="warning"
            message="Users with expired subscriptions"
            count={dashboardData.subscriptions.filter(s => s.subscription_status === 'expired').length}
            onClick={() => setActiveView('billing')}
          />
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Feedback Trend (30 Days)</h3>
            {loading ? (
              <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={feedbackByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} name="Feedback Count" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription Status</h3>
            {loading ? (
              <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={subscriptionStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {subscriptionStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend (30 Days)</h3>
          {loading ? (
            <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="revenue" fill="#10b981" name="Revenue (₦)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    );
  };

  // ===========================
  // USERS VIEW
  // ===========================
  const UsersView = () => {
    const userTableData = dashboardData.users.map(user => ({
      id: user.id,
      email: user.email || 'N/A',
      created_at: new Date(user.created_at).toLocaleDateString(),
      full_name: user.full_name || 'N/A',
      subscription: dashboardData.subscriptions.find(s => s.user_id === user.id)?.subscription_status || 'None'
    }));

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">User Management</h2>
          <p className="text-gray-600">View and manage all platform users</p>
        </div>
        <DataTable
          columns={[
            { label: 'Email', key: 'email' },
            { label: 'Full Name', key: 'full_name' },
            { label: 'Subscription', key: 'subscription', render: (val) => (
              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                val === 'active' ? 'bg-green-100 text-green-800' :
                val === 'trialing' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {val}
              </span>
            )},
            { label: 'Joined', key: 'created_at' }
          ]}
          data={userTableData}
          title={`All Users (${dashboardData.totalUsers})`}
          loading={loading}
          onExport={() => exportToCSV(userTableData, 'users')}
        />
      </div>
    );
  };

  // ===========================
  // BILLING VIEW
  // ===========================
  const BillingView = () => {
    const billingTableData = dashboardData.subscriptions.map(sub => ({
      user_email: dashboardData.users.find(u => u.id === sub.user_id)?.email || 'N/A',
      subscription_status: sub.subscription_status,
      plan: sub.plan || 'N/A',
      created_at: new Date(sub.created_at).toLocaleDateString(),
      trial_ends: sub.trial_ends_at ? new Date(sub.trial_ends_at).toLocaleDateString() : 'N/A'
    }));

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Subscriptions & Billing</h2>
          <p className="text-gray-600">Monitor revenue and manage subscriptions</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Total Revenue"
            value={`₦${dashboardData.totalRevenue.toLocaleString()}`}
            icon={DollarSign}
            color="green"
          />
          <StatCard
            title="Active Subscriptions"
            value={dashboardData.activeSubscriptions}
            icon={CheckCircle}
            color="blue"
          />
          <StatCard
            title="Trial Users"
            value={dashboardData.subscriptions.filter(s => s.subscription_status === 'trialing').length}
            icon={Users}
            color="orange"
          />
        </div>

        <DataTable
          columns={[
            { label: 'User Email', key: 'user_email' },
            { label: 'Status', key: 'subscription_status', render: (val) => (
              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                val === 'active' ? 'bg-green-100 text-green-800' :
                val === 'trialing' ? 'bg-blue-100 text-blue-800' :
                val === 'expired' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {val}
              </span>
            )},
            { label: 'Plan', key: 'plan' },
            { label: 'Created', key: 'created_at' },
            { label: 'Trial Ends', key: 'trial_ends' }
          ]}
          data={billingTableData}
          title={`All Subscriptions (${dashboardData.subscriptions.length})`}
          loading={loading}
          onExport={() => exportToCSV(billingTableData, 'subscriptions')}
        />
      </div>
    );
  };

  // ===========================
  // FEEDBACK VIEW
  // ===========================
  const FeedbackView = () => {
    const feedbackTableData = dashboardData.feedback.map(f => ({
      user: dashboardData.users.find(u => u.id === f.user_id)?.email || 'Anonymous',
      message: f.message?.substring(0, 100) + '...' || 'No message',
      type: f.form_type || 'General',
      created_at: new Date(f.created_at).toLocaleString(),
      sentiment: f.sentiment || 'neutral',
      status: f.status || 'new'
    }));

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Feedback Overview</h2>
          <p className="text-gray-600">Platform-wide feedback monitoring</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Total Feedback"
            value={dashboardData.totalFeedback.toLocaleString()}
            icon={MessageSquare}
            color="purple"
          />
          <StatCard
            title="Last 24 Hours"
            value={dashboardData.feedbackLast24h?.toLocaleString() || '0'}
            icon={Activity}
            color="blue"
          />
          <StatCard
            title="Avg per User"
            value={(dashboardData.totalFeedback / Math.max(dashboardData.totalUsers, 1)).toFixed(1)}
            icon={Users}
            color="green"
          />
        </div>

        <DataTable
          columns={[
            { label: 'User', key: 'user' },
            { label: 'Message', key: 'message' },
            { label: 'Type', key: 'type' },
            { label: 'Status', key: 'status', render: (val) => (
              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                val === 'resolved' ? 'bg-green-100 text-green-800' :
                val === 'new' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {val}
              </span>
            )},
            { label: 'Sentiment', key: 'sentiment', render: (val) => (
              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                val === 'positive' ? 'bg-green-100 text-green-800' :
                val === 'negative' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {val}
              </span>
            )},
            { label: 'Created', key: 'created_at' }
          ]}
          data={feedbackTableData}
          title={`Recent Feedback (${dashboardData.feedback.length})`}
          loading={loading}
          onExport={() => exportToCSV(feedbackTableData, 'feedback')}
        />
      </div>
    );
  };

  // ===========================
  // PROJECTS VIEW
  // ===========================
  const ProjectsView = () => {
    const projectsTableData = dashboardData.projects.map(p => ({
      name: p.name || 'Untitled Project',
      user: dashboardData.users.find(u => u.id === p.user_id)?.email || 'N/A',
      description: p.description?.substring(0, 80) || 'No description',
      created_at: new Date(p.created_at).toLocaleDateString(),
      status: p.status || 'active'
    }));

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Projects</h2>
          <p className="text-gray-600">All projects created by users</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Total Projects"
            value={dashboardData.totalProjects.toLocaleString()}
            icon={Settings}
            color="orange"
          />
          <StatCard
            title="Avg per User"
            value={(dashboardData.totalProjects / Math.max(dashboardData.totalUsers, 1)).toFixed(1)}
            icon={Users}
            color="blue"
          />
          <StatCard
            title="Active Projects"
            value={dashboardData.projects.filter(p => p.status === 'active').length}
            icon={CheckCircle}
            color="green"
          />
        </div>

        <DataTable
          columns={[
            { label: 'Project Name', key: 'name' },
            { label: 'Owner', key: 'user' },
            { label: 'Description', key: 'description' },
            { label: 'Status', key: 'status', render: (val) => (
              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                val === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {val}
              </span>
            )},
            { label: 'Created', key: 'created_at' }
          ]}
          data={projectsTableData}
          title={`All Projects (${dashboardData.totalProjects})`}
          loading={loading}
          onExport={() => exportToCSV(projectsTableData, 'projects')}
        />
      </div>
    );
  };

  // ===========================
  // INSIGHTS VIEW
  // ===========================
  const InsightsView = () => {
    const [insights, setInsights] = useState([]);
    const [loadingInsights, setLoadingInsights] = useState(true);

    useEffect(() => {
      const fetchInsights = async () => {
        const { data } = await supabase.from('insights').select('*').order('created_at', { ascending: false });
        setInsights(data || []);
        setLoadingInsights(false);
      };
      fetchInsights();
    }, []);

    const insightsTableData = insights.map(insight => ({
      title: insight.title || 'Untitled',
      details: insight.details?.substring(0, 80) || 'No details',
      user: dashboardData.users.find(u => u.id === insight.user_id)?.email || 'N/A',
      feedback_count: insight.feedback_count || 0,
      created_at: new Date(insight.created_at).toLocaleDateString()
    }));

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">AI Insights & Settings</h2>
          <p className="text-gray-600">User configurations and AI-generated insights</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Total Insights Generated"
            value={insights.length.toLocaleString()}
            icon={Sparkles}
            color="pink"
          />
          <StatCard
            title="Configured Businesses"
            value={dashboardData.feedbackSettings.length}
            icon={Settings}
            color="blue"
          />
          <StatCard
            title="With Custom Surveys"
            value={dashboardData.feedbackSettings.filter(fs => fs.customer_survey_url).length}
            icon={MessageSquare}
            color="purple"
          />
        </div>

        <DataTable
          columns={[
            { label: 'Title', key: 'title' },
            { label: 'Details', key: 'details' },
            { label: 'User', key: 'user' },
            { label: 'Feedback Count', key: 'feedback_count' },
            { label: 'Created', key: 'created_at' }
          ]}
          data={insightsTableData}
          title={`AI Insights (${insights.length})`}
          loading={loadingInsights}
          onExport={() => exportToCSV(insightsTableData, 'insights')}
        />
      </div>
    );
  };

  // ===========================
  // TRANSACTIONS VIEW
  // ===========================
  const TransactionsView = () => {
    const transactionsTableData = dashboardData.recentTransactions.map(t => ({
      user: dashboardData.users.find(u => u.id === t.user_id)?.email || 'N/A',
      amount: `₦${parseFloat(t.amount || 0).toLocaleString()}`,
      status: t.status || 'completed',
      description: t.description || 'Subscription Payment',
      created_at: new Date(t.created_at).toLocaleString(),
      reference: t.paystack_reference || t.paystack_transaction_id || 'N/A',
      currency: t.currency || 'NGN'
    }));

    const totalAmount = dashboardData.recentTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    const successfulTransactions = dashboardData.recentTransactions.filter(t => t.status === 'success' || t.status === 'completed').length;
    const avgTransaction = totalAmount / Math.max(dashboardData.recentTransactions.length, 1);

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Transactions</h2>
          <p className="text-gray-600">Payment history and transaction monitoring</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard
            title="Total Revenue"
            value={`₦${totalAmount.toLocaleString()}`}
            icon={DollarSign}
            color="green"
          />
          <StatCard
            title="Total Transactions"
            value={dashboardData.recentTransactions.length}
            icon={Activity}
            color="blue"
          />
          <StatCard
            title="Successful"
            value={successfulTransactions}
            icon={CheckCircle}
            color="green"
          />
          <StatCard
            title="Avg Transaction"
            value={`₦${avgTransaction.toFixed(2)}`}
            icon={DollarSign}
            color="purple"
          />
        </div>

        <DataTable
          columns={[
            { label: 'User', key: 'user' },
            { label: 'Amount', key: 'amount' },
            { label: 'Currency', key: 'currency' },
            { label: 'Status', key: 'status', render: (val) => (
              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                val === 'success' || val === 'completed' ? 'bg-green-100 text-green-800' :
                val === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {val}
              </span>
            )},
            { label: 'Description', key: 'description' },
            { label: 'Reference', key: 'reference' },
            { label: 'Date', key: 'created_at' }
          ]}
          data={transactionsTableData}
          title={`Recent Transactions (${dashboardData.recentTransactions.length})`}
          loading={loading}
          onExport={() => exportToCSV(transactionsTableData, 'transactions')}
        />
      </div>
    );
  };

  // ===========================
  // ANALYTICS VIEW
  // ===========================
  const AnalyticsView = () => {
    // Calculate growth metrics
    const last7Days = dashboardData.users.filter(u => {
      const created = new Date(u.created_at);
      const now = new Date();
      return (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24) <= 7;
    }).length;

    const last30Days = dashboardData.users.filter(u => {
      const created = new Date(u.created_at);
      const now = new Date();
      return (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24) <= 30;
    }).length;

    // User growth by month
    const monthlyGrowth: Record<string, number> = {};
    dashboardData.users.forEach(u => {
      const month = new Date(u.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      monthlyGrowth[month] = (monthlyGrowth[month] || 0) + 1;
    });

    const growthData = Object.entries(monthlyGrowth).map(([month, count]) => ({
      month,
      users: count
    })).slice(-12); // Last 12 months

    // Feedback by project
    const feedbackByProject: Record<string, number> = {};
    dashboardData.feedback.forEach(f => {
      const projectId = f.project_id || 'Unknown';
      feedbackByProject[projectId] = (feedbackByProject[projectId] || 0) + 1;
    });

    const topProjects = Object.entries(feedbackByProject)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 10)
      .map(([id, count]) => ({
        project: dashboardData.projects.find(p => p.id === id)?.name || `Project ${id.substring(0, 8)}`,
        feedback_count: count
      }));

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Analytics & Metrics</h2>
          <p className="text-gray-600">Deep-dive platform usage and business intelligence</p>
        </div>

        {/* Growth Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard
            title="New Users (7 days)"
            value={last7Days}
            icon={Users}
            color="blue"
          />
          <StatCard
            title="New Users (30 days)"
            value={last30Days}
            icon={Users}
            color="green"
          />
          <StatCard
            title="Conversion Rate"
            value={`${((dashboardData.activeSubscriptions / Math.max(dashboardData.totalUsers, 1)) * 100).toFixed(1)}%`}
            icon={TrendingUp}
            color="purple"
          />
          <StatCard
            title="Avg Feedback/User"
            value={(dashboardData.totalFeedback / Math.max(dashboardData.totalUsers, 1)).toFixed(1)}
            icon={MessageSquare}
            color="orange"
          />
        </div>

        {/* User Growth Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Growth (Last 12 Months)</h3>
          {loading ? (
            <div className="h-80 bg-gray-100 rounded animate-pulse"></div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="users" fill="#3b82f6" name="New Users" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Projects by Feedback */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Projects by Feedback Volume</h3>
          {loading ? (
            <div className="h-80 bg-gray-100 rounded animate-pulse"></div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={topProjects} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="project" type="category" tick={{ fontSize: 12 }} width={150} />
                <Tooltip />
                <Bar dataKey="feedback_count" fill="#8b5cf6" name="Feedback Count" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Health Score</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">User Engagement</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {((dashboardData.totalFeedback / Math.max(dashboardData.totalUsers, 1)) * 10).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${Math.min((dashboardData.totalFeedback / Math.max(dashboardData.totalUsers, 1)) * 10, 100)}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Subscription Rate</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {((dashboardData.activeSubscriptions / Math.max(dashboardData.totalUsers, 1)) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${(dashboardData.activeSubscriptions / Math.max(dashboardData.totalUsers, 1)) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Project Creation Rate</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {((dashboardData.totalProjects / Math.max(dashboardData.totalUsers, 1)) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full" 
                    style={{ width: `${Math.min((dashboardData.totalProjects / Math.max(dashboardData.totalUsers, 1)) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">Revenue per User</span>
                <span className="text-lg font-bold text-gray-900">
                  ₦{(dashboardData.totalRevenue / Math.max(dashboardData.totalUsers, 1)).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">Feedback per Project</span>
                <span className="text-lg font-bold text-gray-900">
                  {(dashboardData.totalFeedback / Math.max(dashboardData.totalProjects, 1)).toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">Insights Generated</span>
                <span className="text-lg font-bold text-gray-900">
                  {dashboardData.totalInsights}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">Avg Revenue/Transaction</span>
                <span className="text-lg font-bold text-gray-900">
                  ₦{(dashboardData.totalRevenue / Math.max(dashboardData.recentTransactions.length, 1)).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ===========================
  // RENDER ACTIVE VIEW
  // ===========================
  const renderView = () => {
    switch (activeView) {
      case 'overview':
        return <OverviewView />;
      case 'users':
        return <UsersView />;
      case 'billing':
        return <BillingView />;
      case 'feedback':
        return <FeedbackView />;
      case 'projects':
        return <ProjectsView />;
      case 'insights':
        return <InsightsView />;
      case 'transactions':
        return <TransactionsView />;
      case 'analytics':
        return <AnalyticsView />;
      default:
        return (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {navigationItems.find(item => item.id === activeView)?.label}
            </h3>
            <p className="text-gray-600">This module is ready to be built. All components and structure are in place.</p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gray-900 text-white transition-all duration-300 flex flex-col`}>
        <div className="p-4 flex items-center justify-between border-b border-gray-800">
          {sidebarOpen && <h1 className="text-xl font-bold">NoteX Admin</h1>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-800 rounded-lg">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center px-4 py-3 hover:bg-gray-800 transition-colors ${
                  activeView === item.id ? 'bg-gray-800 border-l-4 border-blue-500' : ''
                }`}
              >
                <Icon size={20} className="flex-shrink-0" />
                {sidebarOpen && <span className="ml-3 text-sm">{item.label}</span>}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <div className={`flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
            {sidebarOpen && <span className="text-xs text-gray-400">v1.0.0</span>}
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {renderView()}
        </div>
      </div>
    </div>
  );
};

export default NoteXAdminDashboard;
