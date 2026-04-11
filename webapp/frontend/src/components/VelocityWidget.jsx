/**
 * VelocityWidget — live counters for transaction velocity.
 * Highlights when thresholds are crossed.
 */
import { Zap } from 'lucide-react'

export default function VelocityWidget({ velocity }) {
  if (!velocity) return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 animate-pulse h-32" />
  )

  const rows = [
    { label: 'Last 10 min', count: velocity.last_10min.count, amount: velocity.last_10min.amount, alert: velocity.last_10min.alert, tip: '≥5 transactions is unusual' },
    { label: 'Last 1 hour', count: velocity.last_1hour.count, amount: velocity.last_1hour.amount, alert: velocity.last_1hour.alert, tip: 'Total > $2,000 is unusual' },
    { label: 'Last 24 hours', count: velocity.last_24hours.count, amount: velocity.last_24hours.amount, alert: velocity.last_24hours.alert, tip: 'Total > $5,000 is unusual' },
  ]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4 font-semibold text-gray-800 dark:text-white text-sm">
        <Zap size={16} className="text-yellow-500" /> Live Activity
      </div>
      <div className="space-y-3">
        {rows.map(r => (
          <div key={r.label} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${r.alert ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'bg-gray-50 dark:bg-gray-700/40'}`}>
            <div>
              <p className={`font-medium text-xs ${r.alert ? 'text-red-700 dark:text-red-300' : 'text-gray-600 dark:text-gray-300'}`}>
                {r.label}
                {r.alert && <span className="ml-1.5 text-xs bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 px-1.5 py-0.5 rounded-full">⚠ Unusual</span>}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{r.tip}</p>
            </div>
            <div className="text-right">
              <p className={`font-bold ${r.alert ? 'text-red-600 dark:text-red-400' : 'dark:text-white'}`}>{r.count} txns</p>
              <p className="text-xs text-gray-400">${Number(r.amount).toFixed(2)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
