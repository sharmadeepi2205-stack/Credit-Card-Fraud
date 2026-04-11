import { useEffect, useState } from 'react'
import api from '../api/client'
import toast from 'react-hot-toast'
import { CheckCircle, XCircle, ShieldOff, ChevronDown, ChevronUp } from 'lucide-react'
import WhyFlagged from '../components/WhyFlagged'
import { useT } from '../i18n'

const RISK_BADGE = {
  HIGH: 'bg-red-100 text-red-700',
  MEDIUM: 'bg-orange-100 text-orange-700',
  LOW: 'bg-green-100 text-green-700',
}
const STATUS_BADGE = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  BLOCKED: 'bg-red-100 text-red-700',
  FALSE_POSITIVE: 'bg-gray-100 text-gray-600',
  IGNORED: 'bg-gray-100 text-gray-500',
}

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
  const tr = useT()

  const load = () => api.get('/alerts?limit=100').then(r => setAlerts(r.data)).catch(() => {})
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold dark:text-white">Fraud Alerts</h1>
        <div className="flex gap-2 flex-wrap">
          {['ALL', 'PENDING', 'HIGH', 'APPROVED', 'FALSE_POSITIVE'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-xs font-medium ${filter === f ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 border dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50'}`}>
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {selected.size > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 rounded-xl px-4 py-2 flex items-center gap-3 text-sm flex-wrap">
          <span className="text-blue-700 dark:text-blue-300 font-medium">{selected.size} selected</span>
          <button onClick={() => bulkResolve('FALSE_POSITIVE')}
            className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs dark:text-gray-300 hover:bg-gray-200">
            Mark as false positive
          </button>
          <button onClick={() => bulkResolve('APPROVED')}
            className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs hover:bg-green-200">
            Confirm as fraud
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-gray-400 text-xs hover:text-gray-600">Clear</button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 w-8">
                <input type="checkbox" checked={allSel}
                  onChange={() => allSel ? setSelected(new Set()) : setSelected(new Set(filtered.map(a => a.id)))} />
              </th>
              {['Time', 'Alert', 'Risk', 'Status', 'Actions', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <>
                <tr key={a.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700/40 border-b dark:border-gray-700 ${a.risk_level === 'HIGH' ? 'border-l-4 border-l-red-400' : a.risk_level === 'MEDIUM' ? 'border-l-4 border-l-orange-300' : ''}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggleSel(a.id)} />
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">{fmtDate(a.created_at)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium dark:text-white text-sm">{friendlyTitle(a)}</p>
                    <p className="text-xs text-gray-400">{a.reason?.split(';')[0] || '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${RISK_BADGE[a.risk_level]}`}>
                      {a.risk_level === 'HIGH' ? 'High risk' : a.risk_level === 'MEDIUM' ? 'Medium risk' : 'Low risk'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[a.status]}`}>
                      {a.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {a.status === 'PENDING' && (
                      <div className="flex gap-1 flex-wrap">
                        <button onClick={() => resolve(a.id, 'APPROVED')}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium">
                          <CheckCircle size={11} /> {tr('thisIsMe')}
                        </button>
                        <button onClick={() => blockCard(a.id)}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium">
                          <ShieldOff size={11} /> {tr('blockPayment')}
                        </button>
                        <button onClick={() => resolve(a.id, 'FALSE_POSITIVE')}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-medium">
                          <XCircle size={11} /> {tr('falsePosBtn')}
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                      className="text-gray-400 hover:text-gray-600 p-1" title="Why was this flagged?">
                      {expanded === a.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </td>
                </tr>
                {expanded === a.id && (
                  <tr key={`${a.id}-exp`} className="bg-gray-50 dark:bg-gray-800/60">
                    <td colSpan={7} className="px-6 pb-4 pt-2">
                      <WhyFlagged reason={a.reason} score={a.fraud_score} riskLevel={a.risk_level} />
                    </td>
                  </tr>
                )}
              </>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">No alerts</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
