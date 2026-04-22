import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from './AuthContext'
import { usePrefs } from './PrefsContext'
import { wsUrl } from '../lib/wsUrl'

const AlertsContext = createContext({
  liveAlerts: [],
  freezeAlert: null,
  archiveAlert: () => {},
  archiveAll: () => {},
  dismissFreezeAlert: () => {},
})

const RISK_COLORS = { HIGH: '#ef4444', MEDIUM: '#f97316', LOW: '#22c55e' }

function friendlyMsg(msg) {
  const amt = `${Number(msg.amount || 0).toFixed(2)}`
  if (msg?.risk_level === 'HIGH') return `Unusual activity on your card — $${amt}`
  if (msg?.risk_level === 'MEDIUM') return `Something looks slightly off — $${amt}`
  return `Transaction reviewed — $${amt}`
}

export function AlertsProvider({ children }) {
  const { user } = useAuth()
  const { isDND } = usePrefs()
  const [liveAlerts, setLiveAlerts] = useState([])
  const [freezeAlert, setFreezeAlert] = useState(null)
  const wsRef = useRef(null)

  const archiveAlert = (id) =>
    setLiveAlerts(prev => prev.map(a => a.alert_id === id ? { ...a, archived: true } : a))

  const archiveAll = () =>
    setLiveAlerts(prev => prev.map(a => ({ ...a, archived: true })))

  const dismissFreezeAlert = useCallback(() => setFreezeAlert(null), [])

  useEffect(() => {
    if (!user) return
    const token = localStorage.getItem('access_token')
    const ws = new WebSocket(wsUrl(`/ws/alerts?token=${token}`))
    wsRef.current = ws

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)

        if (msg.type === 'FRAUD_ALERT') {
          setLiveAlerts(prev => [{ ...msg, archived: false }, ...prev].slice(0, 50))
          if (!isDND()) {
            toast.custom(() => (
              <div style={{ borderLeft: `4px solid ${RISK_COLORS[msg.risk_level] || '#94a3b8'}` }}
                className="bg-white shadow-lg rounded p-3 max-w-xs">
                <p className="font-semibold text-sm">{friendlyMsg(msg)}</p>
                {msg.reason && <p className="text-xs text-gray-500 mt-1">{msg.reason}</p>}
              </div>
            ), { duration: 6000 })
          }
        }

        if (msg.type === 'FREEZE_RECOMMENDATION') {
          // Show the freeze modal — replaces any previous one
          setFreezeAlert(msg)
          setLiveAlerts(prev => [{
            ...msg,
            risk_level: 'HIGH',
            alert_id: msg.alert_id,
            archived: false,
          }, ...prev].slice(0, 50))
        }
      } catch { /* ignore malformed messages */ }
    }

    ws.onerror = () => console.warn('WS connection error')
    return () => ws.close()
  }, [user])

  return (
    <AlertsContext.Provider value={{ liveAlerts, freezeAlert, archiveAlert, archiveAll, dismissFreezeAlert }}>
      {children}
    </AlertsContext.Provider>
  )
}

export const useAlerts = () => useContext(AlertsContext)
