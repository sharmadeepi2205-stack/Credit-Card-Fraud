export default function RiskBar({ score, riskLevel, showLabel = true }) {
  const pct = Math.min(Math.max(Number(score) || 0, 0), 100)
  const color = riskLevel === 'HIGH' ? 'bg-risk-high' : riskLevel === 'MEDIUM' ? 'bg-risk-medium' : 'bg-risk-low'
  const label = riskLevel === 'HIGH' ? 'High' : riskLevel === 'MEDIUM' ? 'Medium' : 'Low'

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        {showLabel && <span className="text-xs text-slate-500 dark:text-slate-400">{label} risk</span>}
        <span className="text-xs font-mono text-slate-600 dark:text-slate-300 ml-auto">{pct.toFixed(0)}/100</span>
      </div>
      <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
