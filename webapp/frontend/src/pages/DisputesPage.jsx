import { useEffect, useState } from 'react'
import api from '../api/client'
import toast from 'react-hot-toast'
import { FileText, Plus, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

const STATUS_CONFIG = {
  OPEN:         { icon: Clock,        color: 'bg-blue-100 text-blue-700',   label: 'Open' },
  UNDER_REVIEW: { icon: AlertCircle,  color: 'bg-amber-100 text-amber-700', label: 'Under Review' },
  RESOLVED:     { icon: CheckCircle,  color: 'bg-green-100 text-green-700', label: 'Resolved' },
  REJECTED:     { icon: XCircle,      color: 'bg-red-100 text-red-700',     label: 'Rejected' },
}

const REASONS = [
  'Transaction not recognized',
  'Duplicate charge',
  'Incorrect amount',
  'Service not received',
  'Card used without authorization',
  'Other',
]

export default function DisputesPage() {
  const [disputes, setDisputes] = useState([])
  const [txns, setTxns] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ transaction_id: '', reason: REASONS[0], description: '' })
  const [submitting, setSubmitting] = useState(false)

  const load = () => {
    api.get('/disputes').then(r => setDisputes(r.data)).catch(() => {})
    api.get('/transactions?limit=50').then(r => setTxns(r.data)).catch(() => {})
  }
  useEffect(() => { load() }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (!form.transaction_id) return toast.error('Select a transaction')
    setSubmitting(true)
    try {
      await api.post('/disputes', form)
      toast.success('Dispute raised successfully')
      setShowForm(false)
      setForm({ transaction_id: '', reason: REASONS[0], description: '' })
      load()
    } catch { toast.error('Failed to raise dispute') }
    finally { setSubmitting(false) }
  }

  const fmtDate = ts => { try { return new Date(ts).toLocaleDateString() } catch { return '—' } }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Disputes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Raise and track transaction disputes</p>
        </div>
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
          <Plus size={14} /> Raise Dispute
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="font-semibold dark:text-white mb-4">New Dispute</h2>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Transaction *</label>
              <select required value={form.transaction_id}
                onChange={e => setForm(f => ({ ...f, transaction_id: e.target.value }))}
                className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select a transaction…</option>
                {txns.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.merchant_name || 'Unknown'} — ${Number(t.amount).toFixed(2)} — {fmtDate(t.timestamp)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Reason *</label>
              <select value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {REASONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Additional details</label>
              <textarea rows={3} value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe the issue…"
                className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700">
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {submitting ? 'Submitting…' : 'Submit Dispute'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Disputes list */}
      <div className="space-y-3">
        {disputes.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
            <FileText size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No disputes raised yet</p>
          </div>
        )}
        {disputes.map(d => {
          const cfg = STATUS_CONFIG[d.status] || STATUS_CONFIG.OPEN
          const Icon = cfg.icon
          return (
            <div key={d.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                      <Icon size={11} /> {cfg.label}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">{d.id.slice(0, 8)}…</span>
                  </div>
                  <p className="font-medium dark:text-white">{d.merchant || 'Unknown Merchant'} — ${Number(d.amount || 0).toFixed(2)}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{d.reason}</p>
                  {d.description && <p className="text-xs text-gray-400 mt-1">{d.description}</p>}
                  {d.resolution_note && (
                    <div className="mt-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Resolution: {d.resolution_note}</p>
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">{fmtDate(d.created_at)}</p>
                  {d.resolved_at && <p className="text-xs text-gray-400 mt-1">Resolved {fmtDate(d.resolved_at)}</p>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
