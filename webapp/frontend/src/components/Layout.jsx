import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { usePrefs } from '../context/PrefsContext'
import { useAlerts } from '../context/AlertsContext'
import {
  ShieldCheck, CreditCard, Activity, Bell, LayoutDashboard, LogOut,
  Settings, Moon, Sun, BellOff, Search, Shield, FileText, BarChart2,
  MessageSquare, Zap, MapPin, Network, TrendingUp, Store, ShieldAlert,
  ChevronDown, ChevronRight
} from 'lucide-react'
import NotificationCenter from './NotificationCenter'
import OnboardingTour from './OnboardingTour'
import Tooltip from './Tooltip'

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
      { to: '/transactions', label: 'Transactions', icon: Activity },
      { to: '/timeline',     label: 'Timeline',     icon: MapPin },
      { to: '/alerts',       label: 'Alerts',       icon: Bell, badge: true },
    ],
  },
  {
    label: 'My Cards',
    items: [
      { to: '/cards',    label: 'Cards',    icon: CreditCard },
      { to: '/security', label: 'Security', icon: Shield },
      { to: '/spending', label: 'Spending', icon: TrendingUp },
      { to: '/disputes', label: 'Disputes', icon: FileText },
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

function NavGroup({ group, pendingCount, collapsed, onToggle }) {
  return (
    <div>
      <button onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-blue-400 dark:text-gray-500 uppercase tracking-wider hover:text-blue-200 transition-colors">
        {group.label}
        {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
      </button>
      {!collapsed && group.items.map(({ to, label, icon: Icon, badge }) => (
        <NavLink key={to} to={to}
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-colors mb-0.5 ${
              isActive
                ? 'bg-blue-700 dark:bg-gray-700 text-white'
                : 'text-blue-200 dark:text-gray-400 hover:bg-blue-800 dark:hover:bg-gray-800 hover:text-white'
            }`}>
          <Icon size={14} />
          <span className="flex-1">{label}</span>
          {badge && pendingCount > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full px-1.5 leading-none py-0.5">
              {pendingCount}
            </span>
          )}
        </NavLink>
      ))}
    </div>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const { dark, toggle: toggleDark } = useTheme()
  const { prefs, update } = usePrefs()
  const { liveAlerts } = useAlerts()
  const navigate = useNavigate()
  const pendingCount = liveAlerts.filter(a => !a.archived && a.risk_level === 'HIGH').length
  const [collapsed, setCollapsed] = useState({})

  const toggleGroup = (label) => setCollapsed(c => ({ ...c, [label]: !c[label] }))

  return (
    <div className="flex h-screen overflow-hidden">
      <OnboardingTour />

      {/* Sidebar */}
      <aside className="w-52 bg-blue-900 dark:bg-gray-900 text-white flex flex-col shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-blue-800 dark:border-gray-700">
          <ShieldCheck size={20} className="text-blue-300" />
          <span className="font-bold text-base">FraudGuard</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-3 overflow-y-auto">
          {NAV_GROUPS.map(group => (
            <NavGroup key={group.label} group={group} pendingCount={pendingCount}
              collapsed={!!collapsed[group.label]}
              onToggle={() => toggleGroup(group.label)} />
          ))}

          {/* Admin-only */}
          {user?.is_admin && (
            <div>
              <p className="px-3 py-1.5 text-xs font-semibold text-blue-400 dark:text-gray-500 uppercase tracking-wider">Admin</p>
              {[
                { to: '/monitoring', label: 'Monitoring', icon: BarChart2 },
                { to: '/admin',      label: 'Admin Panel', icon: Settings },
              ].map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-colors mb-0.5 ${
                      isActive ? 'bg-blue-700 dark:bg-gray-700 text-white' : 'text-blue-200 dark:text-gray-400 hover:bg-blue-800 dark:hover:bg-gray-800'
                    }`}>
                  <Icon size={14} /> {label}
                </NavLink>
              ))}
            </div>
          )}
        </nav>

        {/* Bottom controls */}
        <div className="px-3 py-3 border-t border-blue-800 dark:border-gray-700">
          <div className="flex items-center gap-1 mb-2">
            <Tooltip text={dark ? 'Light mode' : 'Dark mode'}>
              <button onClick={toggleDark} className="p-1.5 rounded-lg hover:bg-white/10 text-blue-200">
                {dark ? <Sun size={14} /> : <Moon size={14} />}
              </button>
            </Tooltip>
            <Tooltip text={prefs.dndEnabled ? 'DND on' : 'Quiet mode'}>
              <button onClick={() => update({ dndEnabled: !prefs.dndEnabled })}
                className={`p-1.5 rounded-lg hover:bg-white/10 ${prefs.dndEnabled ? 'text-yellow-300' : 'text-blue-200'}`}>
                <BellOff size={14} />
              </button>
            </Tooltip>
            <Tooltip text={prefs.lang === 'en' ? 'हिंदी' : 'English'}>
              <button onClick={() => update({ lang: prefs.lang === 'en' ? 'hi' : 'en' })}
                className="p-1.5 rounded-lg hover:bg-white/10 text-blue-200 text-xs font-bold">
                {prefs.lang === 'en' ? 'हि' : 'EN'}
              </button>
            </Tooltip>
            <NotificationCenter />
          </div>
          <p className="text-xs text-blue-300 truncate mb-1">{user?.email}</p>
          <button onClick={() => { logout(); navigate('/login') }}
            className="flex items-center gap-1.5 text-xs text-blue-300 hover:text-white transition-colors">
            <LogOut size={12} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
