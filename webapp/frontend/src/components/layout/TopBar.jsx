import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Menu, Bell, Moon, Sun, BellOff, Search } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { usePrefs } from '../../context/PrefsContext'
import { useAlerts } from '../../context/AlertsContext'
import NotificationCenter from '../NotificationCenter'

const BREADCRUMBS = {
  '/dashboard':    ['Dashboard'],
  '/transactions': ['Transactions'],
  '/timeline':     ['Timeline'],
  '/alerts':       ['Alerts'],
  '/cards':        ['Cards'],
  '/security':     ['Security Controls'],
  '/spending':     ['Spending Analytics'],
  '/disputes':     ['Disputes'],
  '/chatbot':      ['AI Assistant'],
  '/analysis':     ['Fraud Analysis'],
  '/simulation':   ['Simulation Sandbox'],
  '/network':      ['Network Graph'],
  '/merchants':    ['Merchant Risk'],
  '/darkweb':      ['Security Tools'],
  '/monitoring':   ['Model Monitoring'],
  '/admin':        ['Admin Panel'],
}

export default function TopBar({ onMenuClick }) {
  const { pathname } = useLocation()
  const { dark, toggle: toggleDark } = useTheme()
  const { prefs, update } = usePrefs()
  const crumbs = BREADCRUMBS[pathname] || [pathname.replace('/', '')]

  return (
    <header className="h-14 flex-shrink-0 bg-white dark:bg-slate-900 border-b border-surface-border dark:border-slate-800 flex items-center px-4 gap-3 sticky top-0 z-30">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuClick}
        className="btn-icon text-slate-500 hover:text-slate-700 lg:hidden flex-shrink-0">
        <Menu size={18} />
      </button>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm flex-1 min-w-0">
        <span className="text-slate-400 dark:text-slate-500 hidden sm:inline">FraudGuard</span>
        <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">/</span>
        <span className="font-medium text-slate-700 dark:text-slate-200 truncate">
          {crumbs[crumbs.length - 1]}
        </span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Search — hidden on mobile */}
        <div className="relative hidden md:block">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search..."
            className="input pl-8 w-52 h-8 text-xs"
          />
        </div>

        {/* DND toggle */}
        <button
          onClick={() => update({ dndEnabled: !prefs.dndEnabled })}
          title={prefs.dndEnabled ? 'Quiet mode on' : 'Enable quiet mode'}
          className={`btn-icon ${prefs.dndEnabled ? 'text-amber-500' : 'text-slate-400 hover:text-slate-600'}`}>
          <BellOff size={16} />
        </button>

        {/* Dark mode */}
        <button onClick={toggleDark} className="btn-icon text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Notification center */}
        <NotificationCenter />
      </div>
    </header>
  )
}
