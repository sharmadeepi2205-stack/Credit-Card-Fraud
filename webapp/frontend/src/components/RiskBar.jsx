/**
 * RiskBar — color progress bar for fraud_score 0-100.
 * Usage: <RiskBar score={72} riskLevel="HIGH" />
 */
export default function RiskBar({ score, riskLevel, showLabel = true }) {
  const pct = Math.min(Math.max(Number(score) || 0, 0), 100)
  const color = riskLevel === 'HIGH' ? 'bg-red-500'
    : riskLevel === 'MEDIUM' ? 'bg-orange-400'
    : 'bg-green-500'
  const label = riskLevel === 'HIGH' ? 'High risk'
    : riskLevel === 'MEDIUM' ? 'Medium risk'
    : 'Low risk'

  return (
    <div className="w-full space-y-1">
      {showLabel && (
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{label}</span>
          <span>{pct.toFixed(0)}/100</span>
        </div>
      )}
      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
        <div className={`h-1.5 rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
