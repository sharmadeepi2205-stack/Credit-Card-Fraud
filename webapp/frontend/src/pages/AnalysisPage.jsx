import { useState } from 'react'
import api from '../api/client'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Search, Upload, Zap } from 'lucide-react'

const COUNTRIES = ['US','GB','DE','FR','CN','RU','IN','BR','NG','RO','PK','AE','SG','JP','AU']
const CATEGORIES = ['Shopping','Food & Drink','Grocery','Transport','Streaming','Electronics',
                    'Fuel','Travel','Finance','Cash','Gaming','Gambling','Crypto','Other']

function RiskGauge({ score }) {
  const color = score >= 70 ? '#ef4444' : score >= 35 ? '#f59e0b' : '#10b981'
  const label = score >= 70 ? 'HIGH RISK' : score >= 35 ? 'MEDIUM RISK' : 'LOW RISK'
  const pct = Math.min(score, 100)
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r="50" fill="none" stroke="#e2e8f0" strokeWidth="12" />
          <circle cx="60" cy="60" r="50" fill="none" stroke={color} strokeWidth="12"
            strokeDasharray={`${pct * 3.14} 314`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold font-mono" style={{ color }}>{score.toFixed(0)}</span>
          <span className="text-xs text-gray-500">/100</span>
        </div>
      </div>
      <span className="text-sm font-semibold px-3 py-1 rounded-full"
        style={{ background: color + '20', color }}>{label}</span>
    </div>
  )
}

function ShapChart({ shap }) {
  if (!shap?.length) return null
  const data = shap.map(s => ({
    name: s.feature.replace(/_/g, ' '),
    impact: Math.abs(s.impact),
    direction: s.direction,
    value: s.value,
  }))
  return (
    <div>
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        Feature contributions (SHAP)
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} layout="vertical">
          <XAxis type="number" tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={130} />
          <Tooltip formatter={(v, n, p) => [`${v.toFixed(3)} (val: ${p.payload.value})`, 'Impact']} />
          <Bar dataKey="impact" radius={4}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.direction === 'increases_risk' ? '#ef4444' : '#10b981'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-400 mt-1">
        <span className="text-red-500">■</span> Increases risk &nbsp;
        <span className="text-green-500">■</span> Decreases risk
      </p>
    </div>
  )
}

export default function AnalysisPage() {
  const [tab, setTab] = useState('manual')
  const [form, setForm] = useState({
    amount: '', merchant_name: '', merchant_category: 'Shopping',
    country: 'US', ip_address: '', device_id: '',
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [csvFile, setCsvFile] = useState(null)
  const [batchResults, setBatchResults] = useState([])
  const [batchLoading, setBatchLoading] = useState(false)

  const handlePredict = async (e) => {
    e.preventDefault()
    if (!form.amount) return toast.error('Amount is required')
    setLoading(true)
    try {
      const { data } = await api.post('/predict', { ...form, amount: parseFloat(form.amount) })
      setResult(data)
    } catch (err) {
      toast.error('Prediction failed')
    } finally {
      setLoading(false)
    }
  }

  const handleBatch = async () => {
    if (!csvFile) return toast.error('Select a CSV file first')
    setBatchLoading(true)
    try {
      // Parse CSV client-side and score each row
      const text = await csvFile.text()
      const lines = text.trim().split('\n')
      const headers = lines[0].split(',').map(h => h.trim())
      const rows = lines.slice(1).map(l => {
        const vals = l.split(',')
        return Object.fromEntries(headers.map((h, i) => [h, vals[i]?.trim()]))
      })
      const results = []
      for (const row of rows.slice(0, 100)) {
        try {
          const { data } = await api.post('/predict', {
            amount: parseFloat(row.Amount || row.amount || 0),
            merchant_name: row.merchant || row.merchant_name || 'Unknown',
            country: row.country || 'US',
          })
          results.push({ ...row, ...data })
        } catch { results.push({ ...row, fraud_score: 'error' }) }
      }
      setBatchResults(results)
      toast.success(`Scored ${results.length} transactions`)
    } catch {
      toast.error('Batch processing failed')
    } finally {
      setBatchLoading(false)
    }
  }

  const downloadBatch = () => {
    if (!batchResults.length) return
    const keys = Object.keys(batchResults[0])
    const csv = [keys.join(','), ...batchResults.map(r => keys.map(k => r[k] ?? '').join(','))].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'fraud_scores.csv'
    a.click()
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold dark:text-white">Fraud Analysis</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Score transactions manually or in bulk
        </p>
      </div>

      <div className="flex gap-2">
        {[['manual', 'Manual Scoring', Search], ['batch', 'Batch Upload', Upload]].map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === id ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 border dark:border-gray-700 text-gray-600 dark:text-gray-300'
            }`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'manual' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input form */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="font-semibold dark:text-white mb-4 flex items-center gap-2">
              <Zap size={16} className="text-blue-500" /> Transaction Details
            </h2>
            <form onSubmit={handlePredict} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Amount ($) *</label>
                  <input type="number" step="0.01" required value={form.amount} onChange={set('amount')}
                    placeholder="0.00"
                    className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Merchant</label>
                  <input value={form.merchant_name} onChange={set('merchant_name')}
                    placeholder="e.g. Amazon"
                    className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Category</label>
                  <select value={form.merchant_category} onChange={set('merchant_category')}
                    className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Country</label>
                  <select value={form.country} onChange={set('country')}
                    className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">IP Address</label>
                  <input value={form.ip_address} onChange={set('ip_address')}
                    placeholder="192.168.1.1"
                    className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Device ID</label>
                  <input value={form.device_id} onChange={set('device_id')}
                    placeholder="device-abc123"
                    className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Scoring…</> : <><Zap size={14} /> Score Transaction</>}
              </button>
            </form>
          </div>

          {/* Result */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            {result ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold dark:text-white">Result</h2>
                  <div className="flex gap-3 text-xs text-gray-500">
                    <span>ML: <strong>{result.ml_score}</strong></span>
                    <span>Rules: <strong>{result.rule_score}</strong></span>
                  </div>
                </div>
                <div className="flex justify-center">
                  <RiskGauge score={result.fraud_score} />
                </div>
                {result.reason && result.reason !== 'Automated risk assessment' && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3">
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">Why flagged</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{result.reason}</p>
                  </div>
                )}
                <ShapChart shap={result.shap} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 py-16">
                <Zap size={32} className="opacity-30" />
                <p className="text-sm">Fill in the form and click Score Transaction</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'batch' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="font-semibold dark:text-white mb-4">Batch CSV Upload</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Upload a CSV with columns: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">Amount, merchant, country</code>. Max 100 rows.
            </p>
            <div className="flex gap-3 items-center">
              <input type="file" accept=".csv" onChange={e => setCsvFile(e.target.files[0])}
                className="text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:text-sm file:font-medium hover:file:bg-blue-100" />
              <button onClick={handleBatch} disabled={batchLoading || !csvFile}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {batchLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Upload size={14} />}
                {batchLoading ? 'Processing…' : 'Score All'}
              </button>
              {batchResults.length > 0 && (
                <button onClick={downloadBatch}
                  className="text-sm text-blue-600 hover:underline">
                  Download results
                </button>
              )}
            </div>
          </div>

          {batchResults.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase text-gray-500 dark:text-gray-400">
                  <tr>
                    {['#', 'Amount', 'Merchant', 'Country', 'Fraud Score', 'Risk'].map(h => (
                      <th key={h} className="px-4 py-3 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {batchResults.map((r, i) => {
                    const score = parseFloat(r.fraud_score) || 0
                    const color = score >= 70 ? 'bg-red-100 text-red-700' : score >= 35 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                    return (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                        <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                        <td className="px-4 py-2 font-mono dark:text-white">${parseFloat(r.Amount || r.amount || 0).toFixed(2)}</td>
                        <td className="px-4 py-2 dark:text-gray-300">{r.merchant || r.merchant_name || '—'}</td>
                        <td className="px-4 py-2 dark:text-gray-300">{r.country || '—'}</td>
                        <td className="px-4 py-2 font-mono font-semibold dark:text-white">{score.toFixed(1)}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
                            {r.risk_level || (score >= 70 ? 'HIGH' : score >= 35 ? 'MEDIUM' : 'LOW')}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
