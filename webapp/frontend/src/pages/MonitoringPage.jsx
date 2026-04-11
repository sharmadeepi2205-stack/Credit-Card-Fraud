import { useEffect, useState } from 'react'
import api from '../api/client'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from 'recharts'
import { Activity, RefreshCw, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

function MetricGauge({ label, value, color }) {
  const pct = Math.round(value * 100)
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 text-center">
      <div className="relative w-24 h-24 mx-auto mb-3">
        <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
          <circle cx="40" cy="40" r="32" fill="none" stroke="#e2e8f0" strokeWidth="8" />
          <circle cx="40" cy="40" r="32" fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${pct * 2.01} 201`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold font-mono" style={{ color }}>{pct}%</span>
        </div>
      </div>
      <p className="text-sm font-medium dark:text-white">{label}</p>
    </div>
  )
}

function ConfusionMatrix({ tp, fp, fn, tn }) {
  const total = tp + fp + fn + tn || 1
  const cells = [
    { label: 'True Positive', val: tp, bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-300' },
    { label: 'False Positive', val: fp, bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-300' },
    { label: 'False Negative', val: fn, bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300' },
    { label: 'True Negative', val: tn, bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300' },
  ]
  return (
    <div className="grid grid-cols-2 gap-3">
      {cells.map(c => (
        <div key={c.label} className={`${c.bg} rounded-xl p-4 text-center`}>
          <p className={`text-2xl font-bold font-mono ${c.text}`}>{c.val}</p>
          <p className={`text-xs mt-1 ${c.text}`}>{c.label}</p>
          <p className="text-xs text-gray-400 mt-0.5">{((c.val / total) * 100).toFixed(1)}%</p>
        </div>
      ))}
    </div>
  )
}

export default function MonitoringPage() {
  const [metrics, setMetrics] = useState(null)
  const [history, setHistory] = useState([])
  const [drift, setDrift] = useState([])
  const [retraining, setRetraining] = useState(false)

  const load = () => {
    api.get('/model/metrics').then(r => setMetrics(r.data)).catch(() => {})
    api.get('/model/history').then(r => setHistory(r.data)).catch(() => {})
    api.get('/model/drift').then(r => setDrift(r.data)).catch(() => {})
  }

  useEffect(() => { load() }, [])

  const retrain = async () => {
    setRetraining(true)
    try {
      const { data } = await api.post('/model/retrain')
      toast.success(`Retraining queued — Job ID: ${data.job_id.slice(0, 8)}`)
    } catch { toast.error('Failed to queue retraining') }
    finally { setRetraining(false) }
  }

  // Build mock trend data from history
  const trendData = history.map(h => ({
    version: h.version,
    precision: Math.round(h.precision * 100),
    recall: Math.round(h.recall * 100),
    f1: Math.round(h.f1 * 100),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Model Monitoring</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track model performance and data drift</p>
        </div>
        <button onClick={retrain} disabled={retraining}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
          {retraining
            ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <RefreshCw size={14} />}
          {retraining ? 'Queuing…' : 'Trigger Retrain'}
        </button>
      </div>

      {/* Metric gauges */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricGauge label="Precision" value={metrics.precision} color="#3b82f6" />
          <MetricGauge label="Recall" value={metrics.recall} color="#10b981" />
          <MetricGauge label="F1 Score" value={metrics.f1} color="#8b5cf6" />
          <MetricGauge label="AUC-ROC" value={metrics.auc_roc} color="#f59e0b" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Confusion matrix */}
        {metrics && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="font-semibold dark:text-white mb-4">Confusion Matrix</h2>
            <ConfusionMatrix tp={metrics.tp} fp={metrics.fp} fn={metrics.fn} tn={metrics.tn} />
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <p className="text-gray-500 dark:text-gray-400 text-xs">False Positive Rate</p>
                <p className="font-bold font-mono dark:text-white">{(metrics.false_positive_rate * 100).toFixed(2)}%</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <p className="text-gray-500 dark:text-gray-400 text-xs">Total Transactions</p>
                <p className="font-bold font-mono dark:text-white">{metrics.total}</p>
              </div>
            </div>
          </div>
        )}

        {/* Performance trend */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="font-semibold dark:text-white mb-4">Performance by Version</h2>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="version" tick={{ fontSize: 11 }} />
                <YAxis domain={[70, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={v => `${v}%`} />
                <Line type="monotone" dataKey="precision" stroke="#3b82f6" name="Precision" strokeWidth={2} dot />
                <Line type="monotone" dataKey="recall" stroke="#10b981" name="Recall" strokeWidth={2} dot />
                <Line type="monotone" dataKey="f1" stroke="#8b5cf6" name="F1" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-sm text-center py-16">No history data</p>}
        </div>

        {/* Data drift */}
        {drift.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="font-semibold dark:text-white mb-4">Data Drift Detection</h2>
            <div className="space-y-4">
              {drift.map(d => (
                <div key={d.feature}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium dark:text-white capitalize">{d.feature.replace(/_/g, ' ')}</span>
                    <span className={`font-mono text-xs ${d.drift_pct > 20 ? 'text-red-500' : d.drift_pct > 10 ? 'text-amber-500' : 'text-green-500'}`}>
                      {d.drift_pct}% drift
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>Baseline: <strong className="dark:text-gray-200">{d.mean_baseline}</strong></span>
                    <span>Recent: <strong className="dark:text-gray-200">{d.mean_recent}</strong></span>
                  </div>
                  <div className="mt-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${d.drift_pct > 20 ? 'bg-red-500' : d.drift_pct > 10 ? 'bg-amber-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(d.drift_pct, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Model version history */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b dark:border-gray-700">
            <h2 className="font-semibold dark:text-white">Model Version History</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase text-gray-500 dark:text-gray-400">
              <tr>
                {['Version', 'Trained', 'F1', 'AUC', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {history.map(h => (
                <tr key={h.version} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                  <td className="px-4 py-3 font-mono font-medium dark:text-white">{h.version}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{h.trained_at}</td>
                  <td className="px-4 py-3 font-mono dark:text-white">{(h.f1 * 100).toFixed(1)}%</td>
                  <td className="px-4 py-3 font-mono dark:text-white">{(h.auc_roc * 100).toFixed(1)}%</td>
                  <td className="px-4 py-3">
                    {h.is_active
                      ? <span className="flex items-center gap-1 text-green-600 text-xs font-medium"><CheckCircle size={12} /> Active</span>
                      : <span className="text-gray-400 text-xs">Archived</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
