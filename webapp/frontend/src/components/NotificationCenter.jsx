import { useState, useRef, useEffect } from 'react'
import { Bell, X, Archive } from 'lucide-react'
import { useAlerts } from '../context/AlertsContext'

const RISK_COLOR = {
  HIGH: 'bg-red-100 text-red-700',
  MEDIUM: 'bg-orange-100 text-orange-700',
  LOW: 'bg-green-100 text-green-700',
}

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

  // Close on outside click
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
        className="relative p-1.5 rounded-lg hover:bg-white/10 transition-colors">
        <Bell size={15} className="text-blue-200" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div data-notif-panel
          style={{ position: 'fixed', top: pos.top, left: pos.left, transform: 'translateY(-100%)', zIndex: 9999 }}
          className="w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b dark:border-gray-700 flex items-center justify-between">
            <span className="font-semibold text-sm text-gray-800 dark:text-white">
              Notifications {unread > 0 && <span className="text-blue-500 font-normal">({unread} new)</span>}
            </span>
            {liveAlerts.some(a => !a.archived) && (
              <button onClick={archiveAll}
                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                <Archive size={11} /> Archive all
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto divide-y dark:divide-gray-700">
            {liveAlerts.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-8">All clear — no new alerts</p>
            )}
            {liveAlerts.map((a, i) => (
              <div key={i}
                className={`px-4 py-3 flex gap-3 items-start transition-opacity ${a.archived ? 'opacity-40' : ''}`}>
                <span className={`mt-0.5 px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${RISK_COLOR[a.risk_level] || 'bg-gray-100 text-gray-600'}`}>
                  {a.risk_level}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700 dark:text-gray-200">{friendlyMsg(a)}</p>
                  {a.reason && <p className="text-xs text-gray-400 mt-0.5 truncate">{a.reason}</p>}
                </div>
                {!a.archived && (
                  <button onClick={() => archiveAlert(a.alert_id)}
                    className="text-gray-300 hover:text-gray-500 shrink-0 mt-0.5">
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
