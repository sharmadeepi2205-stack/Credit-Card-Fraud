function TrendBadge({ change, trend }) {
  if (change == null) return null
  const isUp = trend === 'up'
  const isDown = trend === 'down'
  const color = isUp ? 'text-risk-low bg-risk-low-bg' : isDown ? 'text-risk-high bg-risk-high-bg' : 'text-slate-500 bg-slate-100'
  const arrow = isUp ? '↑' : isDown ? '↓' : '→'
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-2xs font-medium ${color}`}>
      {arrow} {Math.abs(change)}%
    </span>
  )
}

export default function KPICard({ label, value, change, trend = 'neutral', icon: Icon, color = 'bg-brand-50 text-brand-600', loading = false }) {
  if (loading) {
    return (
      <div className="card-hover p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="skeleton w-9 h-9 rounded-lg" />
          <div className="skeleton w-12 h-5 rounded" />
        </div>
        <div className="skeleton w-20 h-7 rounded mb-2" />
        <div className="skeleton w-28 h-4 rounded" />
      </div>
    )
  }

  return (
    <div className="card-hover p-5 transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-lg ${color}`}>
          {Icon && <Icon size={18} />}
        </div>
        <TrendBadge change={change} trend={trend} />
      </div>
      <div className="mt-4">
        <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100 font-mono">{value}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{label}</p>
      </div>
    </div>
  )
}
