import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useAlerts } from '../context/AlertsContext'
import { useLiveFeed } from '../context/LiveFeedContext'
import api from '../api/client'
import { Activity, CreditCard, AlertTriangle, CheckCircle, ShieldCheck, Lock, RefreshCw } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import Tooltip from '../components/Tooltip'
import SafetyTips from '../components/SafetyTips'
import RiskBar from '../components/RiskBar'
import CardFreezeToggle from '../components/CardFreezeToggle'
import VelocityWidget from '../components/VelocityWidget'
import SafeVsSuspicious from '../components/SafeVsSuspicious'
import LocationTimeline from '../components/LocationTimeline'
import LiveTransactionRow from '../components/LiveTransactionRow'
import { useT } from '../i18n'

function StatCard({ icon: Icon, label, value, color, tip }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}><Icon size={20} /></div>
      <div>
        <div className="flex items-center gap-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          {tip && <Tooltip text={tip}><span className="text-gray-300 cursor-help text-xs">ⓘ</span></Tooltip>}
        </div>
        <p className="text-2xl font-bold dark:text-white">{value}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { liveAlerts } = useAlerts()
  const { liveTxns, velocity, cards, refreshCards } = useLiveFeed()
  const tr = useT()

  const [alerts, setAlerts] = useState([])
  const [dailyStats, setDailyStats] = useState([])
  const prevTxnIds = useRef(new Set())
  const [newIds, setNewIds] = useState(new Set())

  // Load alerts once
  useEffect(() => {
    api.get('/alerts?limit=100').then(r => setAlerts(r.data)).catch(() => {})
  }, [])

  // Highlight newly arrived transactions
  useEffect(() => {
    const fresh = liveTxns.filter(t => !prevTxnIds.current.has(t.id)).map(t => t.id)
    if (fresh.length) {
      setNewIds(new Set(fresh))
      fresh.forEach(id => prevTxnIds.current.add(id))
      setTimeout(() => setNewIds(new Set()), 3000)
    }
  }, [liveTxns])

  // Build daily chart from live transactions
  useEffect(() => {
    if (!liveTxns.length) return
    const map = {}
    liveTxns.forEach(t => {
      const d = new Date(t.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
      if (!map[d]) map[d] = { date: d, total: 0, flagged: 0 }
      map[d].total++
      if (t.risk_level === 'HIGH' || t.risk_level === 'MEDIUM') map[d].flagged++
    })
    setDailyStats(Object.values(map).slice(-7))
  }, [liveTxns])

  const pendingAlerts = alerts.filter(a => a.status === 'PENDING').length
  const blockedCount = alerts.filter(a => a.status === 'BLOCKED').length
  const safeCount = alerts.filter(a => a.status === 'APPROVED' || a.status === 'FALSE_POSITIVE').length
  const thisMonth = alerts.filter(a => new Date(a.created_at) > new Date(Date.now() - 30 * 86400000)).length
  const totalSpend = liveTxns.reduce((s, t) => s + (t.amount || 0), 0)
  const primaryCard = cards[0]

  // Build alert lookup by transaction_id for inline actions
  const alertByTxn = {}
  alerts.forEach(a => { if (a.transaction_id) alertByTxn[a.transaction_id] = a.id })

  const reloadAlerts = () => api.get('/alerts?limit=100').then(r => setAlerts(r.data)).catch(() => {})

  return (
    <div className="space-y-5">
      {/* Header + card freeze toggle */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.full_name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Live fraud monitoring dashboard</p>
        </div>
        <CardFreezeToggle card={primaryCard} onToggled={refreshCards} />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CreditCard} label={tr('activeCards')} value={cards.filter(c => c.status === 'ACTIVE').length}
          color="bg-blue-100 text-blue-600" tip="Cards currently active" />
        <StatCard icon={Activity} label="Live transactions" value={liveTxns.length}
          color="bg-purple-100 text-purple-600" tip="Transactions tracked in this session" />
        <StatCard icon={AlertTriangle} label={tr('pendingAlerts')} value={pendingAlerts + liveAlerts.filter(a => !a.archived).length}
          color="bg-orange-100 text-orange-600" tip="Alerts waiting for your review" />
        <StatCard icon={CheckCircle} label={tr('highRisk')} value={liveTxns.filter(t => t.risk_level === 'HIGH').length}
          color="bg-red-100 text-red-600" tip="High-risk transactions detected" />
      </div>

      {/* Row 2: Security summary + chart */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2 font-semibold text-gray-800 dark:text-white text-sm">
            <ShieldCheck size={16} className="text-green-600" /> {tr('securitySummary')}
          </div>
          <div className="space-y-2 text-sm">
            {[
              { label: tr('alertsThisMonth'), val: thisMonth, cls: 'dark:text-white' },
              { label: tr('blocked'), val: blockedCount, cls: 'text-red-600' },
              { label: tr('confirmedSafe'), val: safeCount, cls: 'text-green-600' },
            ].map(r => (
              <div key={r.label} className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{r.label}</span>
                <span className={`font-semibold ${r.cls}`}>{r.val}</span>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t dark:border-gray-700">
            <p className="text-xs text-gray-400">Total spend tracked</p>
            <p className="text-xl font-bold dark:text-white">${totalSpend.toFixed(2)}</p>
          </div>
          {/* Card risk meter */}
          {primaryCard && (
            <div className="pt-2 border-t dark:border-gray-700">
              <p className="text-xs text-gray-400 mb-1.5">Card risk level</p>
              <RiskBar
                score={liveTxns.filter(t => t.risk_level === 'HIGH').length > 2 ? 75 : liveTxns.filter(t => t.risk_level === 'MEDIUM').length > 3 ? 45 : 15}
                riskLevel={liveTxns.filter(t => t.risk_level === 'HIGH').length > 2 ? 'HIGH' : liveTxns.filter(t => t.risk_level === 'MEDIUM').length > 3 ? 'MEDIUM' : 'LOW'}
              />
            </div>
          )}
        </div>

        <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5">
          <p className="font-semibold text-gray-800 dark:text-white mb-3 text-sm">Daily activity</p>
          {dailyStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <ReTooltip />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" name="Total" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="flagged" stroke="#ef4444" name="Flagged" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-12">No data yet — click "Simulate Stream" on the Transactions page</p>
          )}
        </div>
      </div>

      {/* Row 3: Velocity + Safe vs Suspicious */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <VelocityWidget velocity={velocity} />
        <SafeVsSuspicious txns={liveTxns} />
      </div>

      {/* Row 4: Live feed + Location timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Live transaction feed */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="font-semibold text-sm dark:text-white">Live Transaction Feed</span>
            </div>
            <span className="text-xs text-gray-400">Auto-updates every 5s</span>
          </div>
          <div className="divide-y dark:divide-gray-700 max-h-96 overflow-y-auto">
            {liveTxns.slice(0, 20).map(t => (
              <LiveTransactionRow
                key={t.id}
                txn={t}
                alertId={alertByTxn[t.id]}
                isNew={newIds.has(t.id)}
                onResolved={reloadAlerts}
              />
            ))}
            {liveTxns.length === 0 && (
              <p className="text-center text-gray-400 py-10 text-sm">
                No transactions yet — go to Transactions and click "Simulate Stream"
              </p>
            )}
          </div>
        </div>

        {/* Location timeline */}
        <LocationTimeline txns={liveTxns} />
      </div>

      <SafetyTips />
    </div>
  )
}
