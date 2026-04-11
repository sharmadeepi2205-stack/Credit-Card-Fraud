import { useEffect, useState } from 'react'
import api from '../api/client'
import toast from 'react-hot-toast'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, Legend
} from 'recharts'
import { Download, Plus, Pencil } from 'lucide-react'

const STATUS_BADGE = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  BLOCKED: 'bg-red-100 text-red-700',
  FALSE_POSITIVE: 'bg-gray-100 text-gray-600',
  IGNORED: 'bg-gray-100 text-gray-500',
}

export default function AdminPage() {
  const [tab, setTab] = useState('analytics')
  const [dailyStats, setDailyStats] = useState([])
  const [metrics, setMetrics] = useState(null)
  const [topMerchants, setTopMerchants] = useState([])
  const [cases, setCases] = useState([])
  const [rules, setRules] = useState([])
  const [ruleForm, setRuleForm] = useState({ name: '', rule_type: 'VELOCITY', description: '', parameters: '{"max_txn": 5, "window_minutes": 10}', is_active: true })
  const [editingRule, setEditingRule] = useState(null)

  useEffect(() => {
    api.get('/admin/stats/daily?days=14').then(r => setDailyStats(r.data))
    api.get('/admin/stats/model-metrics').then(r => setMetrics(r.data))
    api.get('/admin/stats/top-merchants').then(r => setTopMerchants(r.data))
    api.get('/admin/cases?limit=50').then(r => setCases(r.data))
    api.get('/admin/rules').then(r => setRules(r.data))
  }, [])

  const resolveCase = async (id, status) => {
    await api.patch(`/admin/cases/${id}`, { status })
    toast.success('Case updated')
    api.get('/admin/cases?limit=50').then(r => setCases(r.data))
  }

  const saveRule = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...ruleForm, parameters: JSON.parse(ruleForm.parameters) }
      if (editingRule) {
        await api.patch(`/admin/rules/${editingRule}`, payload)
        toast.success('Rule updated')
      } else {
        await api.post('/admin/rules', payload)
        toast.success('Rule created')
      }
      setEditingRule(null)
      setRuleForm({ name: '', rule_type: 'VELOCITY', description: '', parameters: '{}', is_active: true })
      api.get('/admin/rules').then(r => setRules(r.data))
    } catch (err) {
      toast.error('Invalid JSON in parameters or save failed')
    }
  }

  const exportCSV = () => { window.open('/api/admin/export/alerts', '_blank') }

  const tabs = ['analytics', 'cases', 'rules']

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Portal</h1>
        <button onClick={exportCSV}
          className="flex items-center gap-2 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-900">
          <Download size={14} /> Export Alerts CSV
        </button>
      </div>

      <div className="flex gap-2 border-b">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'analytics' && (
        <div className="space-y-6">
          {/* Model metrics */}
          {metrics && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Precision', val: metrics.precision },
                { label: 'Recall', val: metrics.recall },
                { label: 'F1 Score', val: metrics.f1 },
                { label: 'ROC-AUC', val: metrics.roc_auc },
                { label: 'FP Rate', val: metrics.false_positive_rate },
              ].map(({ label, val }) => (
                <div key={label} className="bg-white rounded-xl shadow-sm p-4 text-center">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-xl font-bold text-blue-700">{(val * 100).toFixed(1)}%</p>
                </div>
              ))}
            </div>
          )}

          {/* Daily chart */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="font-semibold mb-4">Daily Transactions vs Fraud Alerts</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total_transactions" stroke="#3b82f6" name="Total" dot={false} />
                <Line type="monotone" dataKey="fraud_alerts" stroke="#ef4444" name="Fraud Alerts" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Top merchants */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="font-semibold mb-4">Top Merchants by Fraud Alerts</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topMerchants}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="merchant_name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="alert_count" fill="#f97316" name="Alerts" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === 'cases' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                {['User', 'Risk', 'Score', 'Reason', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {cases.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500 font-mono">{c.user_id.slice(0, 8)}…</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      c.risk_level === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                    }`}>{c.risk_level}</span>
                  </td>
                  <td className="px-4 py-3">{Number(c.fraud_score).toFixed(1)}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{c.reason || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[c.status]}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {c.status === 'PENDING' && (
                      <div className="flex gap-1">
                        <button onClick={() => resolveCase(c.id, 'APPROVED')}
                          className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">Approve</button>
                        <button onClick={() => resolveCase(c.id, 'FALSE_POSITIVE')}
                          className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200">FP</button>
                        <button onClick={() => resolveCase(c.id, 'BLOCKED')}
                          className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200">Block</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {cases.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">No cases</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'rules' && (
        <div className="space-y-4">
          <form onSubmit={saveRule} className="bg-white rounded-xl shadow-sm p-5 grid grid-cols-2 gap-4">
            <h2 className="col-span-2 font-semibold">{editingRule ? 'Edit Rule' : 'New Fraud Rule'}</h2>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
              <input required value={ruleForm.name} onChange={e => setRuleForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select value={ruleForm.rule_type} onChange={e => setRuleForm(f => ({ ...f, rule_type: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                {['VELOCITY', 'AMOUNT', 'GEO', 'CUSTOM'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Parameters (JSON)</label>
              <textarea rows={3} value={ruleForm.parameters}
                onChange={e => setRuleForm(f => ({ ...f, parameters: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm font-mono" />
            </div>
            <div className="col-span-2 flex gap-2 justify-end">
              {editingRule && (
                <button type="button" onClick={() => setEditingRule(null)}
                  className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
              )}
              <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                {editingRule ? 'Update Rule' : 'Create Rule'}
              </button>
            </div>
          </form>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  {['Name', 'Type', 'Parameters', 'Active', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rules.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3 text-gray-500">{r.rule_type}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 max-w-xs truncate">
                      {JSON.stringify(r.parameters)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${r.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {r.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => {
                        setEditingRule(r.id)
                        setRuleForm({ name: r.name, rule_type: r.rule_type, description: r.description || '', parameters: JSON.stringify(r.parameters, null, 2), is_active: r.is_active })
                      }} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {rules.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-10 text-gray-400">No rules yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
