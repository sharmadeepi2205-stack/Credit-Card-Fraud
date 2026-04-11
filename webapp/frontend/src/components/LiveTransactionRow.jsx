/**
 * LiveTransactionRow — single row in the live feed.
 * Shows risk bar + inline alert actions if flagged.
 */
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import RiskBar from './RiskBar'
import AlertActions from './AlertActions'

const RISK_BADGE = {
  HIGH: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  MEDIUM: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  LOW: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
}

function fmtTime(ts) {
  try { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) } catch { return '' }
}

export default function LiveTransactionRow({ txn, alertId, isNew, onResolved }) {
  const [expanded, setExpanded] = useState(false)
  const flagged = txn.risk_level === 'HIGH' || txn.risk_level === 'MEDIUM'

  return (
    <div className={`border-b dark:border-gray-700 transition-all ${isNew ? 'animate-pulse-once bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Time */}
        <span className="text-xs text-gray-400 w-16 shrink-0 font-mono">{fmtTime(txn.timestamp)}</span>

        {/* Merchant + risk bar */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium dark:text-white truncate">{txn.merchant_name || 'Unknown'}</span>
            {txn.country && <span className="text-xs text-gray-400">{txn.country}</span>}
          </div>
          <RiskBar score={txn.fraud_score} riskLevel={txn.risk_level} showLabel={false} />
        </div>

        {/* Amount + badge */}
        <div className="text-right shrink-0">
          <p className="font-semibold text-sm dark:text-white">${Number(txn.amount).toFixed(2)}</p>
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${RISK_BADGE[txn.risk_level] || 'bg-gray-100 text-gray-500'}`}>
            {txn.risk_level || 'N/A'}
          </span>
        </div>

        {/* Expand if flagged and has alert */}
        {flagged && alertId && (
          <button onClick={() => setExpanded(e => !e)}
            className="text-gray-400 hover:text-gray-600 p-1 shrink-0">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>

      {expanded && alertId && (
        <div className="px-4 pb-4 bg-gray-50 dark:bg-gray-800/60">
          <AlertActions alertId={alertId} onResolved={() => { setExpanded(false); onResolved?.() }} />
        </div>
      )}
    </div>
  )
}
