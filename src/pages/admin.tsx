// src/pages/Admin.tsx
import React, { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, DollarSign, MessageSquare, Zap, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Settings, Menu, X, Search, Filter, Download, Mail, Shield, FileText, Activity, BarChart3, Sparkles, FlaskConical, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// ===========================
// STAT CARD COMPONENT
// ===========================
const StatCard = ({ title, value, change, trend, icon: Icon, color = 'blue', loading = false }: {
  title: string;
  value: string;
  change?: number;
  trend?: 'up' | 'down';
  icon: any;
  color?: string;
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
      // Fetch profiles with count
      const { data: profiles, count: profilesCount, error: profilesError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' });

      if (profilesError) throw profilesError;

      // Fetch billing profiles
      const { data: billingProfiles, error: billingError } = await supabase
        .from('billing_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (billingError) throw billingError;

      // Fetch feedback with count
      const { data: feedback, count: feedbackCount, error: feedbackError } = await supabase
        .from('feedback')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(100);

      if (feedbackError) throw feedbackError;

      // Fetch transactions
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (transactionsError) throw transactionsError;

      // Fetch projects with count
      const { data: projects, count: projectsCount, error: projectsError } = await supabase
        .from('projects')
        .select('*', { count: 'exact' });

      if (projectsError) throw projectsError;

      // Fetch insights with count
      const { data: insights, count: insightsCount, error: insightsError } = await supabase
        .from('insights')
        .select('*', { count: 'exact' });

      if (insightsError) throw insightsError;

      // Fetch feedback settings
      const { data: feedbackSettings, error: settingsError } = await supabase
        .from('feedback_settings')
        .select('*');

      if (settingsError) throw settingsError;

      // Calculate metrics
      const totalRevenue = transactions?.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0) || 0;
      const activeSubscriptions = billingProfiles?.filter(b => b.subscription_status === 'active').length || 0;
      const last24hFeedback = feedback?.filter(f => {
        const created = new Date(f.created_at);
        const now = new Date();
        return (now.getTime() - created.getTime()) / (1000 * 60 * 60) <= 24;
      }).length || 0;

      setDashboardData({
        totalUsers: profilesCount || 0,
        activeSubscriptions,
        totalRevenue,
        totalFeedback: feedbackCount || 0,
        feedbackLast24h: last24hFeedback,
        totalProjects: projectsCount || 0,
        totalInsights: insightsCount || 0,
        users: profiles || [],
        subscriptions: billingProfiles || [],
        feedback: feedback || [],
        recentTransactions: transactions || [],
        projects: projects || [],
        feedbackSettings: feedbackSettings || []
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

  // I'll continue with the rest of the views in the next part...
  // (UsersView, BillingView, FeedbackView, etc. - they remain the same as your original code)

  const renderView = () => {
    if (activeView === 'overview') return <OverviewView />;
    // Add other views here
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {navigationItems.find(item => item.id === activeView)?.label}
        </h3>
        <p className="text-gray-600">This view is loading data from Supabase...</p>
      </div>
    );
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