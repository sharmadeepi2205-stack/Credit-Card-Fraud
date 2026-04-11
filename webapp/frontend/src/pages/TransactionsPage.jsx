import { useEffect, useState } from 'react'
import { useLiveFeed } from '../context/LiveFeedContext'
import api from '../api/client'
import toast from 'react-hot-toast'
import { Play, RefreshCw, Download, Activity } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import SectionCard from '../components/ui/SectionCard'
import RiskBadge from '../components/ui/RiskBadge'
import StatusBadge from '../components/ui/StatusBadge'
import EmptyState from '../components/ui/EmptyState'
import { SkeletonTable } from '../components/ui/Skeletons'

function fmtDate(ts) {
  try { return ts ? new Date(ts).toLocaleString() : '—' } catch { return '—' }
}

export default function TransactionsPage() {
  const { liveTxns } = useLiveFeed()
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [search, setSearch] = useState('')
  const [filterRisk, setFilterRisk] = useState('ALL')

  const load = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 300)
  }
  useEffect(() => { load() }, [])

  const startStream = async () => {
    setStreaming(true)
    try {
      await api.post('/simulate/stream?count=20&delay=1.5')
      toast.success('Streaming 20 transactions in background')
    } catch {
      toast.error('Add a card first to stream transactions')
    } finally {
      setStreaming(false)
    }
  }

  const filtered = (liveTxns || []).filter(t => {
    const matchSearch = !search ||
      (t.merchant_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.country || '').toLowerCase().includes(search.toLowerCase())
    const matchRisk = filterRisk === 'ALL' || t.risk_level === filterRisk
    return matchSearch && matchRisk
  })

  const downloadCSV = () => {
    const rows = [['ID','Merchant','Category','Country','Amount','Risk','Score','Time'],
      ...filtered.map(t => [t.id?.slice(0,8), t.merchant_name||'', t.merchant_category||'',
        t.country||'', t.amount, t.risk_level||'', t.fraud_score||'', fmtDate(t.timestamp)])]
    const csv = rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'transactions.csv'; a.click()
  }

  if (loading) return <SkeletonTable rows={10} cols={6} />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        subtitle={`${filtered.length} transactions`}
        actions={
          <>
            <button onClick={startStream} disabled={streaming} className="btn-secondary btn-sm">
              {streaming
                ? <span className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                : <Play size={13} />}
              {streaming ? 'Streaming…' : 'Simulate Stream'}
            </button>
            <button onClick={downloadCSV} className="btn-secondary btn-sm">
              <Download size={13} /> Export CSV
            </button>
          </>
        }
      />

      <SectionCard noPadding>
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-surface-border dark:border-slate-800 flex flex-col sm:flex-row gap-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search merchant, country…"
            className="input flex-1"
          />
          <div className="flex gap-2">
            {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(r => (
              <button key={r} onClick={() => setFilterRisk(r)}
                className={`btn-sm rounded-md px-3 ${filterRisk === r ? 'btn-primary' : 'btn-secondary'}`}>
                {r}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={Activity} title="No transactions found" subtitle="Try adjusting your filters or simulate a stream" />
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Merchant</th>
                  <th className="hidden sm:table-cell">Category</th>
                  <th className="hidden md:table-cell">Country</th>
                  <th>Amount</th>
                  <th>Risk</th>
                  <th className="hidden lg:table-cell">Score</th>
                  <th className="hidden xl:table-cell">Time</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id}>
                    <td>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{t.merchant_name || 'Unknown'}</p>
                        <p className="text-xs text-slate-400 sm:hidden">{t.merchant_category || '—'}</p>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell text-slate-500">{t.merchant_category || '—'}</td>
                    <td className="hidden md:table-cell text-slate-500">{t.country || '—'}</td>
                    <td className="font-mono font-medium text-slate-900 dark:text-slate-100">
                      ${Number(t.amount).toFixed(2)}
                    </td>
                    <td><RiskBadge level={t.risk_level} score={t.fraud_score} /></td>
                    <td className="hidden lg:table-cell font-mono text-slate-500">
                      {t.fraud_score != null ? Number(t.fraud_score).toFixed(1) : '—'}
                    </td>
                    <td className="hidden xl:table-cell text-slate-400 text-xs">{fmtDate(t.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination hint */}
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-surface-border dark:border-slate-800 flex items-center justify-between">
            <p className="text-xs text-slate-500">Showing {filtered.length} transactions</p>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
