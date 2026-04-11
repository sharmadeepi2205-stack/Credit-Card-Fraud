/**
 * SafeVsSuspicious — live side-by-side comparison of normal vs flagged transactions today.
 */
import { CheckCircle, AlertTriangle } from 'lucide-react'
import RiskBar from './RiskBar'

export default function SafeVsSuspicious({ txns }) {
  const today = new Date().toDateString()
  const todayTxns = txns.filter(t => new Date(t.timestamp).toDateString() === today)
  const safe = todayTxns.filter(t => t.risk_level === 'LOW' || !t.risk_level)
  const flagged = todayTxns.filter(t => t.risk_level === 'HIGH' || t.risk_level === 'MEDIUM')

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5">
      <p className="font-semibold text-gray-800 dark:text-white text-sm mb-4">Today's activity</p>
      <div className="grid grid-cols-2 gap-3">
        {/* Safe */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <CheckCircle size={14} className="text-green-600" />
            <span className="text-xs font-semibold text-green-700 dark:text-green-300">Normal</span>
            <span className="ml-auto text-lg font-bold text-green-700 dark:text-green-300">{safe.length}</span>
          </div>
          <div className="space-y-1 max-h-28 overflow-y-auto">
            {safe.slice(0, 5).map(t => (
              <div key={t.id} className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                <span className="truncate max-w-[80px]">{t.merchant_name || 'Unknown'}</span>
                <span className="font-medium">${Number(t.amount).toFixed(0)}</span>
              </div>
            ))}
            {safe.length === 0 && <p className="text-xs text-gray-400">None yet</p>}
          </div>
        </div>

        {/* Flagged */}
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle size={14} className="text-red-600" />
            <span className="text-xs font-semibold text-red-700 dark:text-red-300">Flagged</span>
            <span className="ml-auto text-lg font-bold text-red-700 dark:text-red-300">{flagged.length}</span>
          </div>
          <div className="space-y-1.5 max-h-28 overflow-y-auto">
            {flagged.slice(0, 5).map(t => (
              <div key={t.id} className="space-y-0.5">
                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                  <span className="truncate max-w-[80px]">{t.merchant_name || 'Unknown'}</span>
                  <span className="font-medium">${Number(t.amount).toFixed(0)}</span>
                </div>
                <RiskBar score={t.fraud_score} riskLevel={t.risk_level} showLabel={false} />
              </div>
            ))}
            {flagged.length === 0 && <p className="text-xs text-gray-400">None yet 🎉</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
