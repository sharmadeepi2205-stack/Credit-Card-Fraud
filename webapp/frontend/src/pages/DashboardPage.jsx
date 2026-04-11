import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useAlerts } from '../context/AlertsContext'
import { useLiveFeed } from '../context/LiveFeedContext'
import api from '../api/client'
import { Activity, CreditCard, AlertTriangle, CheckCircle, ShieldCheck, TrendingUp, RefreshCw } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import PageHeader from '../components/ui/PageHeader'
import SectionCard from '../components/ui/SectionCard'
import KPICard from '../components/ui/KPICard'
import RiskBadge from '../components/ui/RiskBadge'
import EmptyState from '../components/ui/EmptyState'
import { SkeletonCard } from '../components/ui/Skeletons'
import SafetyTips from '../components/SafetyTips'

function fmtDate(ts) {
  try { return ts ? new Date(ts).toLocaleString() : '—' } catch { return '—' }
}

function fmtTime(ts) {
  try { return ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—' } catch { return '—' }
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { liveAlerts } = useAlerts()
  const { liveTxns, velocity, cards, refreshCards } = useLiveFeed()
  const [alerts, setAlerts] = useState([])
  const [dailyStats, setDailyStats] = useState([])
  const [loading, setLoading] = useState(true)
  const prevTxnIds = useRef(new Set())
  const [newIds, setNewIds] = useState(new Set())

  useEffect(() => {
    api.get('/alerts?limit=100').then(r => setAlerts(r.data)).catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const fresh = liveTxns.filter(t => !prevTxnIds.current.has(t.id)).map(t => t.id)
    if (fresh.length) {
      setNewIds(new Set(fresh))
      fresh.forEach(id => prevTxnIds.current.add(id))
      setTimeout(() => setNewIds(new Set()), 3000)
    }
  }, [liveTxns])

  useEffect(() => {
    if (!liveTxns.length) return
    const map = {}
    liveTxns.forEach(t => {
      const d = new Date(t.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
      if (!map[d]) map[d] = { date: d, total: 0, flagged: 0 }
      map[d].total++
      if (t.risk_level === 'HIGH' || t.risk_level === 'MEDIUM') map[d].flagged++
    })
    setDailyStats(Object.values(map).slice(-14))
  }, [liveTxns])

  const pendingAlerts = alerts.filter(a => a.status === 'PENDING').length
  const blockedCount = alerts.filter(a => a.status === 'BLOCKED').length
  const safeCount = alerts.filter(a => a.status === 'APPROVED' || a.status === 'FALSE_POSITIVE').length
  const thisMonth = alerts.filter(a => new Date(a.created_at) > new Date(Date.now() - 30 * 86400000)).length
  const totalSpend = (liveTxns || []).reduce((s, t) => s + (t.amount || 0), 0)
  const highRiskCount = (liveTxns || []).filter(t => t.risk_level === 'HIGH').length

  const kpis = [
    { label: 'Active Cards', value: (cards || []).filter(c => c.status === 'ACTIVE').length, icon: CreditCard, color: 'bg-brand-50 text-brand-600' },
    { label: 'Transactions', value: (liveTxns || []).length, icon: Activity, color: 'bg-purple-50 text-purple-600' },
    { label: 'Pending Alerts', value: pendingAlerts + liveAlerts.filter(a => !a.archived).length, icon: AlertTriangle, color: 'bg-amber-50 text-amber-600' },
    { label: 'High Risk Flagged', value: highRiskCount, icon: ShieldCheck, color: 'bg-red-50 text-red-600' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.full_name?.split(' ')[0] || 'User'} 👋`}
        subtitle="Here's your fraud monitoring overview"
        actions={
          <button onClick={refreshCards} className="btn-secondary btn-sm">
            <RefreshCw size={13} /> Refresh
          </button>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : kpis.map(k => <KPICard key={k.label} {...k} />)
        }
      </div>

      {/* Chart + Security summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard
          title="Transaction Activity"
          subtitle="Last 14 days — total vs flagged"
          className="lg:col-span-2">
          {dailyStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12 }}
                />
                <Line type="monotone" dataKey="total" stroke="#4F46E5" name="Total" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="flagged" stroke="#EF4444" name="Flagged" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={Activity} title="No data yet" subtitle="Simulate transactions to see activity" />
          )}
        </SectionCard>

        {/* Security summary */}
        <SectionCard title="Security Summary">
          <div className="space-y-3">
            {[
              { label: 'Alerts this month', value: thisMonth, color: 'text-slate-900 dark:text-slate-100' },
              { label: 'Blocked', value: blockedCount, color: 'text-risk-high font-semibold' },
              { label: 'Confirmed safe', value: safeCount, color: 'text-risk-low font-semibold' },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between py-2 border-b border-surface-border dark:border-slate-800 last:border-0">
                <span className="text-sm text-slate-500 dark:text-slate-400">{r.label}</span>
                <span className={`text-sm font-mono ${r.color}`}>{r.value}</span>
              </div>
            ))}
            <div className="pt-2">
              <p className="text-xs text-slate-400 mb-1">Total spend tracked</p>
              <p className="text-2xl font-semibold font-mono text-slate-900 dark:text-slate-100">
                ${totalSpend.toFixed(2)}
              </p>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Live feed */}
      <SectionCard
        title="Live Transaction Feed"
        subtitle="Auto-updates every 5s"
        actions={
          <span className="flex items-center gap-1.5 text-xs text-risk-low">
            <span className="w-1.5 h-1.5 rounded-full bg-risk-low animate-pulse" />
            Live
          </span>
        }
        noPadding>
        {(liveTxns || []).length === 0 ? (
          <EmptyState icon={Activity} title="No transactions yet" subtitle="Go to Transactions and click Simulate Stream" />
        ) : (
          <div className="divide-y divide-surface-border dark:divide-slate-800 max-h-80 overflow-y-auto">
            {(liveTxns || []).slice(0, 20).map(t => (
              <div key={t.id}
                className={`flex items-center gap-4 px-5 py-3 transition-colors duration-300 ${newIds.has(t.id) ? 'bg-brand-50 dark:bg-brand-900/20' : 'hover:bg-surface-secondary dark:hover:bg-slate-800/50'}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {t.merchant_name || 'Unknown Merchant'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{t.country || '—'} · {fmtTime(t.timestamp)}</p>
                </div>
                <RiskBadge level={t.risk_level} score={t.fraud_score} />
                <span className="text-sm font-semibold font-mono text-slate-900 dark:text-slate-100 flex-shrink-0">
                  ${Number(t.amount).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SafetyTips />
    </div>
  )
}
