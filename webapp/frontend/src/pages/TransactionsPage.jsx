import { useState } from 'react'
import { useLiveFeed } from '../context/LiveFeedContext'
import api from '../api/client'
import toast from 'react-hot-toast'
import { Play, RefreshCw } from 'lucide-react'
import RiskBar from '../components/RiskBar'

function fmtDate(ts) {
  try { return ts ? new Date(ts).toLocaleString() : '—' } catch { return '—' }
}

export default function TransactionsPage() {
  const { liveTxns } = useLiveFeed()
  const [streaming, setStreaming] = useState(false)

  const startStream = async () => {
    setStreaming(true)
    try {
      await api.post('/simulate/stream?count=20&delay=1.5')
      toast.success('Streaming 20 transactions — dashboard updates automatically')
    } catch {
      toast.error('Add a card first before streaming')
    } finally {
      setStreaming(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Transactions</h1>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse inline-block" />
            Live — auto-refreshes every 5 seconds
          </p>
        </div>
        <button onClick={startStream} disabled={streaming}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 font-medium">
          <Play size={14} /> {streaming ? 'Starting…' : 'Simulate Stream'}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
            <tr>
              {['Time', 'Merchant', 'Country', 'Amount', 'Risk Score', 'Risk Level'].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-gray-700">
            {liveTxns.map(t => (
              <tr key={t.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/40 ${t.risk_level === 'HIGH' ? 'border-l-4 border-l-red-400' : t.risk_level === 'MEDIUM' ? 'border-l-4 border-l-orange-300' : ''}`}>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">{fmtDate(t.timestamp)}</td>
                <td className="px-4 py-3 font-medium dark:text-white">{t.merchant_name || '—'}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{t.country || '—'}</td>
                <td className="px-4 py-3 font-semibold dark:text-white">${Number(t.amount).toFixed(2)}</td>
                <td className="px-4 py-3 w-36">
                  <RiskBar score={t.fraud_score} riskLevel={t.risk_level} showLabel={false} />
                  <span className="text-xs text-gray-400">{t.fraud_score != null ? Number(t.fraud_score).toFixed(1) : '—'}/100</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    t.risk_level === 'HIGH' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                    : t.risk_level === 'MEDIUM' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                    : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                  }`}>
                    {t.risk_level || 'N/A'}
                  </span>
                </td>
              </tr>
            ))}
            {liveTxns.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">No transactions yet — click Simulate Stream</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
