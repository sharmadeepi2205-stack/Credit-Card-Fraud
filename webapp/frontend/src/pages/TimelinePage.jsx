import { useEffect, useState } from 'react'
import api from '../api/client'
import { MapPin, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

const FLAG = {
  US:'🇺🇸',GB:'🇬🇧',DE:'🇩🇪',FR:'🇫🇷',CN:'🇨🇳',RU:'🇷🇺',BR:'🇧🇷',IN:'🇮🇳',
  AU:'🇦🇺',JP:'🇯🇵',NG:'🇳🇬',RO:'🇷🇴',PK:'🇵🇰',AE:'🇦🇪',SG:'🇸🇬',MT:'🇲🇹',
  CY:'🇨🇾',CA:'🇨🇦',MX:'🇲🇽',ZA:'🇿🇦',
}

function fmtDate(ts) {
  try { return new Date(ts).toLocaleString() } catch { return '—' }
}

function TimelineItem({ txn, prev, isLast }) {
  const risk = txn.risk_level
  const isFlagged = risk === 'HIGH' || risk === 'MEDIUM'
  const dotColor = risk === 'HIGH' ? 'bg-red-500' : risk === 'MEDIUM' ? 'bg-amber-500' : 'bg-green-500'
  const cardBorder = risk === 'HIGH' ? 'border-red-300 dark:border-red-700' : risk === 'MEDIUM' ? 'border-amber-300 dark:border-amber-700' : 'border-slate-200 dark:border-slate-700'

  // Detect impossible travel
  let travelWarning = null
  if (prev && prev.country && txn.country && prev.country !== txn.country) {
    const prevTime = new Date(prev.timestamp)
    const curTime = new Date(txn.timestamp)
    const diffMin = Math.abs(curTime - prevTime) / 60000
    if (diffMin < 120) {
      travelWarning = `⚡ ${prev.country} → ${txn.country} in ${Math.round(diffMin)} min — possible impossible travel`
    }
  }

  return (
    <div className="flex gap-4">
      {/* Timeline spine */}
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 shadow ${dotColor} shrink-0 mt-4`} />
        {!isLast && <div className="w-0.5 flex-1 bg-gray-200 dark:bg-gray-700 mt-1" />}
      </div>

      {/* Card */}
      <div className={`flex-1 mb-4 bg-white dark:bg-gray-800 rounded-xl border ${cardBorder} p-4 hover:shadow-md transition-shadow`}>
        {travelWarning && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg px-3 py-2 mb-3 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
            <AlertTriangle size={12} /> {travelWarning}
          </div>
        )}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{FLAG[txn.country] || '🌍'}</span>
              <span className="font-semibold text-sm dark:text-white">{txn.merchant_name || 'Unknown Merchant'}</span>
              {isFlagged && <AlertTriangle size={13} className={risk === 'HIGH' ? 'text-red-500' : 'text-amber-500'} />}
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1"><MapPin size={10} /> {txn.country || '—'}</span>
              <span className="flex items-center gap-1"><Clock size={10} /> {fmtDate(txn.timestamp)}</span>
              {txn.merchant_category && <span className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">{txn.merchant_category}</span>}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="font-bold font-mono dark:text-white">${Number(txn.amount).toFixed(2)}</p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              risk === 'HIGH' ? 'bg-red-100 text-red-700' :
              risk === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
              'bg-green-100 text-green-700'
            }`}>{risk || 'N/A'}</span>
            {txn.fraud_score != null && (
              <p className="text-xs text-gray-400 mt-1">Score: {Number(txn.fraud_score).toFixed(0)}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TimelinePage() {
  const [txns, setTxns] = useState([])
  const [filter, setFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/transactions?limit=100')
      .then(r => setTxns(r.data))
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'ALL' ? txns
    : txns.filter(t => t.risk_level === filter)

  const sorted = [...filtered].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

  const stats = {
    total: txns.length,
    high: txns.filter(t => t.risk_level === 'HIGH').length,
    medium: txns.filter(t => t.risk_level === 'MEDIUM').length,
    countries: new Set(txns.map(t => t.country).filter(Boolean)).size,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
          <MapPin size={22} className="text-blue-500" /> Transaction Timeline
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Full chronological history with geographic anomaly detection
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total', val: stats.total, color: 'text-blue-600' },
          { label: 'High Risk', val: stats.high, color: 'text-red-600' },
          { label: 'Medium Risk', val: stats.medium, color: 'text-amber-600' },
          { label: 'Countries', val: stats.countries, color: 'text-purple-600' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
            <p className={`text-2xl font-bold font-mono ${s.color}`}>{s.val}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 border dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-blue-400'
            }`}>
            {f === 'ALL' ? `All (${txns.length})` : `${f} (${txns.filter(t => t.risk_level === f).length})`}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="space-y-4">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0 mt-4" />
                <div className="w-0.5 flex-1 bg-gray-100 dark:bg-gray-800 mt-1" />
              </div>
              <div className="flex-1 mb-4 h-20 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <Clock size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No transactions found</p>
        </div>
      ) : (
        <div>
          {sorted.map((t, i) => (
            <TimelineItem key={t.id} txn={t} prev={sorted[i - 1]} isLast={i === sorted.length - 1} />
          ))}
        </div>
      )}
    </div>
  )
}
