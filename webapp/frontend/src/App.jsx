import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AlertsProvider } from './context/AlertsContext'
import { ThemeProvider } from './context/ThemeContext'
import { PrefsProvider } from './context/PrefsContext'
import { LiveFeedProvider } from './context/LiveFeedContext'

import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import TransactionsPage from './pages/TransactionsPage'
import AlertsPage from './pages/AlertsPage'
import CardsPage from './pages/CardsPage'
import AdminPage from './pages/AdminPage'
import AnalysisPage from './pages/AnalysisPage'
import SecurityPage from './pages/SecurityPage'
import MonitoringPage from './pages/MonitoringPage'
import DisputesPage from './pages/DisputesPage'
import ChatbotPage from './pages/ChatbotPage'
import SimulationPage from './pages/SimulationPage'
import TimelinePage from './pages/TimelinePage'
import NetworkGraphPage from './pages/NetworkGraphPage'
import SpendingPage from './pages/SpendingPage'
import MerchantsPage from './pages/MerchantsPage'
import DarkWebPage from './pages/DarkWebPage'
import Layout from './components/Layout'

function PrivateRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && !user.is_admin) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <ThemeProvider>
      <PrefsProvider>
        <AuthProvider>
          <AlertsProvider>
            <LiveFeedProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="transactions" element={<TransactionsPage />} />
                <Route path="alerts" element={<AlertsPage />} />
                <Route path="cards" element={<CardsPage />} />
                <Route path="analysis" element={<AnalysisPage />} />
                <Route path="security" element={<SecurityPage />} />
                <Route path="disputes" element={<DisputesPage />} />
                <Route path="chatbot" element={<ChatbotPage />} />
                <Route path="simulation" element={<SimulationPage />} />
                <Route path="timeline" element={<TimelinePage />} />
                <Route path="network" element={<NetworkGraphPage />} />
                <Route path="spending" element={<SpendingPage />} />
                <Route path="merchants" element={<MerchantsPage />} />
                <Route path="darkweb" element={<DarkWebPage />} />
                <Route path="monitoring" element={<PrivateRoute adminOnly><MonitoringPage /></PrivateRoute>} />
                <Route path="admin" element={<PrivateRoute adminOnly><AdminPage /></PrivateRoute>} />
              </Route>
            </Routes>
            </LiveFeedProvider>
          </AlertsProvider>
        </AuthProvider>
      </PrefsProvider>
    </ThemeProvider>
  )
}
