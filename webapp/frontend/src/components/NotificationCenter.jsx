import { useState, useRef, useEffect } from 'react'
import { Bell, X, Archive } from 'lucide-react'
import { useAlerts } from '../context/AlertsContext'
import RiskBadge from './ui/RiskBadge'

function friendlyMsg(a) {
  const amt = `$${Number(a.amount || 0).toFixed(2)}`
  if (a.risk_level === 'HIGH') return `Unusual activity — ${amt}`
  if (a.risk_level === 'MEDIUM') return `Slightly unusual — ${amt}`
  return `Transaction reviewed — ${amt}`
}

export default function NotificationCenter() {
  const { liveAlerts, archiveAlert, archiveAll } = useAlerts()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef()

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (!e.target.closest('[data-notif-panel]') && !btnRef.current?.contains(e.target))
        setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.top - 8, left: r.right + 8 })
    }
    setOpen(o => !o)
  }

  const unread = liveAlerts.filter(a => !a.archived).length

  return (
    <>
      <button ref={btnRef} onClick={toggle}
        className="btn-icon text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 relative">
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-risk-high text-white text-2xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div data-notif-panel
          style={{ position: 'fixed', top: pos.top, left: pos.left, transform: 'translateY(-100%)', zIndex: 9999 }}
          className="w-80 bg-white dark:bg-slate-900 rounded-xl shadow-dropdown border border-surface-border dark:border-slate-700 overflow-hidden animate-fade-in">
          <div className="px-4 py-3 border-b border-surface-border dark:border-slate-700 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-900 dark:text-white">
              Notifications {unread > 0 && <span className="text-brand-600 font-normal">({unread})</span>}
            </span>
            {liveAlerts.some(a => !a.archived) && (
              <button onClick={archiveAll} className="btn-ghost btn-sm text-xs gap-1">
                <Archive size={11} /> Archive all
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-surface-border dark:divide-slate-700">
            {liveAlerts.length === 0 && (
              <div className="py-10 text-center">
                <Bell size={20} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-400">All clear — no new alerts</p>
              </div>
            )}
            {liveAlerts.map((a, i) => (
              <div key={i} className={`px-4 py-3 flex gap-3 items-start transition-opacity ${a.archived ? 'opacity-40' : ''}`}>
                <div className="mt-0.5 flex-shrink-0">
                  <RiskBadge level={a.risk_level} showScore={false} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700 dark:text-slate-200">{friendlyMsg(a)}</p>
                  {a.reason && <p className="text-xs text-slate-400 mt-0.5 truncate">{a.reason}</p>}
                </div>
                {!a.archived && (
                  <button onClick={() => archiveAlert(a.alert_id)}
                    className="text-slate-300 hover:text-slate-500 flex-shrink-0 mt-0.5">
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
