const MAP = {
  PENDING:        'badge bg-amber-50 text-amber-700',
  APPROVED:       'badge bg-risk-low-bg text-risk-low',
  BLOCKED:        'badge bg-risk-high-bg text-risk-high',
  FALSE_POSITIVE: 'badge bg-slate-100 text-slate-600',
  IGNORED:        'badge bg-slate-100 text-slate-500',
  ACTIVE:         'badge bg-risk-low-bg text-risk-low',
  ONLINE_ONLY:    'badge bg-amber-50 text-amber-700',
  OPEN:           'badge bg-brand-50 text-brand-700',
  UNDER_REVIEW:   'badge bg-amber-50 text-amber-700',
  RESOLVED:       'badge bg-risk-low-bg text-risk-low',
  REJECTED:       'badge bg-risk-high-bg text-risk-high',
}

export default function StatusBadge({ status }) {
  const cls = MAP[status] || 'badge bg-slate-100 text-slate-600'
  return <span className={cls}>{status?.replace(/_/g, ' ')}</span>
}
