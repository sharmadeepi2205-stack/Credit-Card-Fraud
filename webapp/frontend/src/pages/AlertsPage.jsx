import { useEffect, useState } from 'react'
import api from '../api/client'
import toast from 'react-hot-toast'
import { CheckCircle, XCircle, ShieldOff, ChevronDown, ChevronUp, Bell } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import SectionCard from '../components/ui/SectionCard'
import RiskBadge from '../components/ui/RiskBadge'
import StatusBadge from '../components/ui/StatusBadge'
import EmptyState from '../components/ui/EmptyState'
import WhyFlagged from '../components/WhyFlagged'
import { SkeletonTable } from '../components/ui/Skeletons'

function fmtDate(ts) {
  try { return ts ? new Date(ts).toLocaleString() : '—' } catch { return '—' }
}

function friendlyTitle(a) {
  if (a.risk_level === 'HIGH') return 'Unusual activity on your card'
  if (a.risk_level === 'MEDIUM') return 'Something looks slightly off'
  return 'Transaction reviewed'
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([])
  const [filter, setFilter] = useState('ALL')
  const [expanded, setExpanded] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api.get('/alerts?limit=100').then(r => setAlerts(r.data))
      .catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const resolve = async (id, status) => {
    try { await api.patch(`/alerts/${id}`, { status }); toast.success('Alert updated'); load() }
    catch { toast.error('Failed to update') }
  }
  const blockCard = async (id) => {
    try { await api.post(`/alerts/${id}/block-card`); toast.success('Card blocked'); load() }
    catch { toast.error('Failed to block card') }
  }
  const bulkResolve = async (status) => {
    await Promise.all([...selected].map(id => api.patch(`/alerts/${id}`, { status }).catch(() => {})))
    toast.success(`${selected.size} alerts updated`)
    setSelected(new Set()); load()
  }

  const filtered = filter === 'ALL' ? alerts
    : filter === 'HIGH' ? alerts.filter(a => a.risk_level === 'HIGH')
    : alerts.filter(a => a.status === filter)

  const toggleSel = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const allSel = filtered.length > 0 && filtered.every(a => selected.has(a.id))

  if (loading) return <SkeletonTable rows={8} cols={5} />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fraud Alerts"
        subtitle={`${alerts.filter(a => a.status === 'PENDING').length} pending review`}
      />

      {/* Filter tabs */}
      <div className="flex gap-1 bg-surface-tertiary dark:bg-slate-800 p-1 rounded-lg w-fit flex-wrap">
        {['ALL', 'PENDING', 'HIGH', 'APPROVED', 'FALSE_POSITIVE'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-card'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
            }`}>
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl px-4 py-2.5 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-brand-700 dark:text-brand-300">{selected.size} selected</span>
          <button onClick={() => bulkResolve('FALSE_POSITIVE')} className="btn-secondary btn-sm">Mark as false positive</button>
          <button onClick={() => bulkResolve('APPROVED')} className="btn-sm bg-risk-low-bg text-risk-low hover:bg-green-100 rounded-md px-3">Confirm fraud</button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-slate-400 hover:text-slate-600">Clear</button>
        </div>
      )}

      <SectionCard noPadding>
        {filtered.length === 0 ? (
          <EmptyState icon={Bell} title="No alerts" subtitle="All clear — no fraud alerts match this filter" />
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-8">
                    <input type="checkbox" checked={allSel}
                      onChange={() => allSel ? setSelected(new Set()) : setSelected(new Set(filtered.map(a => a.id)))}
                      className="rounded" />
                  </th>
                  <th>Alert</th>
                  <th>Risk</th>
                  <th className="hidden sm:table-cell">Status</th>
                  <th className="hidden md:table-cell">Time</th>
                  <th>Actions</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <>
                    <tr key={a.id}
                      className={`${a.risk_level === 'HIGH' ? 'border-l-2 border-l-risk-high' : a.risk_level === 'MEDIUM' ? 'border-l-2 border-l-risk-medium' : ''}`}>
                      <td>
                        <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggleSel(a.id)} className="rounded" />
                      </td>
                      <td>
                        <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{friendlyTitle(a)}</p>
                        <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{a.reason?.split(';')[0] || '—'}</p>
                      </td>
                      <td><RiskBadge level={a.risk_level} score={a.fraud_score} /></td>
                      <td className="hidden sm:table-cell"><StatusBadge status={a.status} /></td>
                      <td className="hidden md:table-cell text-xs text-slate-400">{fmtDate(a.created_at)}</td>
                      <td>
                        {a.status === 'PENDING' && (
                          <div className="flex gap-1 flex-wrap">
                            <button onClick={() => resolve(a.id, 'APPROVED')}
                              className="btn-sm bg-risk-low-bg text-risk-low hover:bg-green-100 rounded-md px-2 gap-1">
                              <CheckCircle size={11} /> <span className="hidden sm:inline">This is me</span>
                            </button>
                            <button onClick={() => blockCard(a.id)}
                              className="btn-sm bg-risk-high-bg text-risk-high hover:bg-red-100 rounded-md px-2 gap-1">
                              <ShieldOff size={11} /> <span className="hidden sm:inline">Block</span>
                            </button>
                            <button onClick={() => resolve(a.id, 'FALSE_POSITIVE')}
                              className="btn-sm bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-md px-2 gap-1">
                              <XCircle size={11} /> <span className="hidden sm:inline">FP</span>
                            </button>
                          </div>
                        )}
                      </td>
                      <td>
                        <button onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                          className="btn-icon text-slate-400 hover:text-slate-600">
                          {expanded === a.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </td>
                    </tr>
                    {expanded === a.id && (
                      <tr key={`${a.id}-exp`}>
                        <td colSpan={7} className="px-5 pb-4 pt-2 bg-surface-secondary dark:bg-slate-800/50">
                          <WhyFlagged reason={a.reason} score={a.fraud_score} riskLevel={a.risk_level} />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
