import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuth } from './hooks/useAuth'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Navbar } from './components/Navbar'

// Pages
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { DashboardPage } from './pages/DashboardPage'
import { FeedbackPage } from './pages/FeedbackPage'
import { InsightsPage } from './pages/InsightsPage'
import { ReportsPage } from './pages/ReportsPage'
import { TeamPage } from './pages/TeamPage'
import { SettingsPage } from './pages/SettingsPage'
import { BillingPage } from './pages/BillingPage'

function App() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10B981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
          }}
        />

        {user ? (
          <div className="min-h-screen">
            <Navbar />
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } />
              <Route path="/feedback" element={
                <ProtectedRoute>
                  <FeedbackPage />
                </ProtectedRoute>
              } />
              <Route path="/insights" element={
                <ProtectedRoute>
                  <InsightsPage />
                </ProtectedRoute>
              } />
              <Route path="/reports" element={
                <ProtectedRoute>
                  <ReportsPage />
                </ProtectedRoute>
              } />
              <Route path="/team" element={
                <ProtectedRoute>
                  <TeamPage />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              } />
              <Route path="/billing" element={
                <ProtectedRoute>
                  <BillingPage />
                </ProtectedRoute>
              } />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        ) : (
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        )}
      </div>
    </Router>
  )
}

export default App