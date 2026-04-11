/**
 * LiveFeedContext — merges WebSocket push + 5s polling fallback.
 * Provides:
 *   liveTxns      — latest transactions (newest first, max 50)
 *   velocity      — { last_10min, last_1hour, last_24hours }
 *   cards         — user's cards (refreshed on freeze toggle)
 *   refreshCards  — call after freeze toggle
 */
import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import api from '../api/client'
import { useAuth } from './AuthContext'

const LiveFeedContext = createContext({})

const POLL_MS = 5000   // fallback polling interval

export function LiveFeedProvider({ children }) {
  const { user } = useAuth()
  const [liveTxns, setLiveTxns] = useState([])
  const [velocity, setVelocity] = useState(null)
  const [cards, setCards] = useState([])
  const lastSeenRef = useRef(null)
  const wsRef = useRef(null)

  const refreshCards = useCallback(() => {
    api.get('/cards').then(r => setCards(r.data)).catch(() => {})
  }, [])

  const fetchVelocity = useCallback(() => {
    api.get('/transactions/velocity').then(r => setVelocity(r.data)).catch(() => {})
  }, [])

  const fetchLatest = useCallback(() => {
    const params = lastSeenRef.current ? `?since=${lastSeenRef.current}&limit=20` : '?limit=30'
    api.get(`/transactions/live${params}`).then(r => {
      if (!r.data.length) return
      setLiveTxns(prev => {
        const ids = new Set(prev.map(t => t.id))
        const fresh = r.data.filter(t => !ids.has(t.id))
        if (!fresh.length) return prev
        lastSeenRef.current = fresh[0].timestamp
        return [...fresh, ...prev].slice(0, 50)
      })
    }).catch(() => {})
  }, [])

  // Initial load
  useEffect(() => {
    if (!user) return
    api.get('/transactions/live?limit=30').then(r => {
      setLiveTxns(r.data)
      if (r.data.length) lastSeenRef.current = r.data[0].timestamp
    }).catch(() => {})
    refreshCards()
    fetchVelocity()
  }, [user])

  // WebSocket — listen for TRANSACTION_UPDATE events
  useEffect(() => {
    if (!user) return
    const token = localStorage.getItem('access_token')
    if (!token) return
    const ws = new WebSocket(`ws://${window.location.host}/ws/alerts?token=${token}`)
    wsRef.current = ws

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'TRANSACTION_UPDATE') {
          const t = msg.transaction
          setLiveTxns(prev => {
            if (prev.find(x => x.id === t.id)) return prev
            lastSeenRef.current = t.timestamp
            return [t, ...prev].slice(0, 50)
          })
          fetchVelocity()
        }
      } catch { /* ignore */ }
    }
    ws.onerror = () => {}
    return () => ws.close()
  }, [user])

  // Polling fallback (catches transactions from simulation background tasks)
  useEffect(() => {
    if (!user) return
    const id = setInterval(() => { fetchLatest(); fetchVelocity() }, POLL_MS)
    return () => clearInterval(id)
  }, [user, fetchLatest, fetchVelocity])

  return (
    <LiveFeedContext.Provider value={{ liveTxns, velocity, cards, refreshCards }}>
      {children}
    </LiveFeedContext.Provider>
  )
}

export const useLiveFeed = () => useContext(LiveFeedContext)
