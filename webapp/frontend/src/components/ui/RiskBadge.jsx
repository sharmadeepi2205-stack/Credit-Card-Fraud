const CONFIG = {
  HIGH:   { label: 'High',   bg: 'bg-risk-high-bg',   text: 'text-risk-high',   dot: 'bg-risk-high' },
  MEDIUM: { label: 'Medium', bg: 'bg-risk-medium-bg', text: 'text-risk-medium', dot: 'bg-risk-medium' },
  LOW:    { label: 'Low',    bg: 'bg-risk-low-bg',    text: 'text-risk-low',    dot: 'bg-risk-low' },
}

export default function RiskBadge({ level, score, showScore = true }) {
  const cfg = CONFIG[level] || { label: level || 'N/A', bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' }
  return (
    <span className={`badge ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {showScore && score != null ? `${Number(score).toFixed(0)} · ` : ''}{cfg.label}
    </span>
  )
}
