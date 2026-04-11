import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Activity, Search, Users, Shield, Bell,
  BarChart2, Settings, LogOut, ShieldCheck, CreditCard,
  MessageSquare, Zap, MapPin, Network, TrendingUp, Store,
  ShieldAlert, FileText, X
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useAlerts } from '../../context/AlertsContext'

const NAV = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard',    label: 'Dashboard',     icon: LayoutDashboard },
      { to: '/transactions', label: 'Transactions',  icon: Activity },
      { to: '/timeline',     label: 'Timeline',      icon: MapPin },
      { to: '/alerts',       label: 'Alerts',        icon: Bell, badge: true },
    ],
  },
  {
    label: 'My Cards',
    items: [
      { to: '/cards',    label: 'Cards',         icon: CreditCard },
      { to: '/security', label: 'Security',      icon: Shield },
      { to: '/spending', label: 'Spending',      icon: TrendingUp },
      { to: '/disputes', label: 'Disputes',      icon: FileText },
    ],
  },
  {
    label: 'AI Tools',
    items: [
      { to: '/chatbot',    label: 'AI Assistant',  icon: MessageSquare },
      { to: '/analysis',   label: 'Analysis',      icon: Search },
      { to: '/simulation', label: 'Simulation',    icon: Zap },
      { to: '/network',    label: 'Network Graph', icon: Network },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/merchants', label: 'Merchants',      icon: Store },
      { to: '/darkweb',   label: 'Security Tools', icon: ShieldAlert },
    ],
  },
]

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuth()
  const { liveAlerts } = useAlerts()
  const navigate = useNavigate()
  const pendingCount = liveAlerts.filter(a => !a.archived && a.risk_level === 'HIGH').length

  return (
    <div className="flex flex-col h-full w-60 bg-white dark:bg-slate-900 border-r border-surface-border dark:border-slate-800">
      {/* Logo */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-surface-border dark:border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
            <ShieldCheck size={15} className="text-white" />
          </div>
          <span className="font-semibold text-slate-900 dark:text-white text-base">FraudGuard</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="btn-icon text-slate-400 hover:text-slate-600 lg:hidden">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {NAV.map(group => (
          <div key={group.label}>
            <p className="px-3 mb-1 text-2xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon, badge }) => (
                <NavLink key={to} to={to} onClick={onClose}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'active' : ''}`
                  }>
                  <Icon size={15} className="flex-shrink-0" />
                  <span className="flex-1">{label}</span>
                  {badge && pendingCount > 0 && (
                    <span className="ml-auto bg-risk-high text-white text-2xs font-bold rounded-full px-1.5 py-0.5 leading-none">
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}

        {/* Admin section */}
        {user?.is_admin && (
          <div>
            <p className="px-3 mb-1 text-2xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Admin
            </p>
            <div className="space-y-0.5">
              {[
                { to: '/monitoring', label: 'Monitoring', icon: BarChart2 },
                { to: '/admin',      label: 'Admin Panel', icon: Settings },
              ].map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} onClick={onClose}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <Icon size={15} className="flex-shrink-0" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* User footer */}
      <div className="flex-shrink-0 px-3 py-3 border-t border-surface-border dark:border-slate-800">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-surface-tertiary dark:hover:bg-slate-800 transition-colors">
          <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-brand-700 dark:text-brand-400">
              {user?.full_name?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
              {user?.full_name || 'User'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={() => { logout(); navigate('/login') }}
            className="btn-icon text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex-shrink-0"
            title="Sign out">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
