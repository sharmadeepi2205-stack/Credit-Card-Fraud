import { useEffect, useState } from 'react'
import api from '../api/client'
import { Store, AlertTriangle, TrendingUp } from 'lucide-react'
import RiskBar from '../components/RiskBar'

const TIER_CONFIG = {
  HIGH:   { bg: 'bg-red-50 dark:bg-red-900/10',    border: 'border-red-200 dark:border-red-800',    badge: 'bg-red-100 text-red-700' },
  MEDIUM: { bg: 'bg-amber-50 dark:bg-amber-900/10', border: 'border-amber-200 dark:border-amber-800', badge: 'bg-amber-100 text-amber-700' },
  LOW:    { bg: 'bg-white dark:bg-gray-800',         border: 'border-slate-200 dark:border-slate-700', badge: 'bg-green-100 text-green-700' },
}

export default function MerchantsPage() {
  const [merchants, setMerchants] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')

  useEffect(() => {
    api.get('/merchants/risk').then(r => setMerchants(r.data)).finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'ALL' ? merchants : merchants.filter(m => m.risk_tier === filter)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
          <Store size={22} className="text-purple-500" /> Merchant Risk Profiles
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Fraud rate and risk score per merchant based on your transaction history
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {['HIGH','MEDIUM','LOW'].map(tier => {
          const count = merchants.filter(m => m.risk_tier === tier).length
          const cfg = TIER_CONFIG[tier]
          return (
            <div key={tier} className={`rounded-xl border p-4 text-center ${cfg.bg} ${cfg.border}`}>
              <p className="text-2xl font-bold font-mono dark:text-white">{count}</p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badge}`}>{tier} Risk</span>
            </div>
          )
        })}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['ALL','HIGH','MEDIUM','LOW'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 border dark:border-gray-700 text-gray-600 dark:text-gray-300'
            }`}>{f}</button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(m => {
            const cfg = TIER_CONFIG[m.risk_tier] || TIER_CONFIG.LOW
            return (
              <div key={m.merchant} className={`rounded-2xl border p-5 ${cfg.bg} ${cfg.border}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold dark:text-white">{m.merchant}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{m.category}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badge}`}>
                    {m.risk_tier}
                  </span>
                </div>
                <RiskBar score={m.avg_score} riskLevel={m.risk_tier} />
                <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Transactions</p>
                    <p className="font-semibold text-sm dark:text-white">{m.total_txns}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Spend</p>
                    <p className="font-semibold text-sm dark:text-white">${m.total_amount.toFixed(0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Fraud Rate</p>
                    <p className={`font-semibold text-sm ${m.fraud_rate > 20 ? 'text-red-600' : m.fraud_rate > 5 ? 'text-amber-600' : 'text-green-600'}`}>
                      {m.fraud_rate}%
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="col-span-2 text-center py-12 text-gray-400">
              <Store size={32} className="mx-auto mb-3 opacity-30" />
              No merchants found
            </div>
          )}
        </div>
      )}
    </div>
  )
}
