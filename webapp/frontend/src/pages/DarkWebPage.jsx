import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import toast from 'react-hot-toast'
import { Shield, Search, AlertTriangle, CheckCircle, Download, FileText } from 'lucide-react'

export default function DarkWebPage() {
  const { user } = useAuth()
  const [email, setEmail] = useState(user?.email || '')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  const check = async (e) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    try {
      const { data } = await api.post('/security/breach', { email })
      setResult(data)
    } catch {
      toast.error('Check failed — please try again')
    } finally {
      setLoading(false)
    }
  }

  const downloadPDF = async () => {
    setPdfLoading(true)
    try {
      const resp = await api.get('/reports/pdf', { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `fraudguard_report.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('PDF report downloaded')
    } catch {
      toast.error('Failed to generate PDF')
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
          <Shield size={22} className="text-red-500" /> Security Tools
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Dark web breach check and downloadable fraud report
        </p>
      </div>

      {/* Dark web check */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-2 mb-1 font-semibold dark:text-white">
          <Search size={16} className="text-red-500" /> Dark Web Breach Check
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Check if your email appears in known data breaches using HaveIBeenPwned.
        </p>
        <form onSubmit={check} className="flex gap-3">
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="flex-1 border dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm hover:bg-red-700 disabled:opacity-50">
            {loading
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Search size={14} />}
            {loading ? 'Checking…' : 'Check'}
          </button>
        </form>

        {result && (
          <div className={`mt-4 rounded-xl p-4 border ${
            result.breached
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
              : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
          }`}>
            <div className="flex items-start gap-3">
              {result.breached
                ? <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />
                : <CheckCircle size={20} className="text-green-600 shrink-0 mt-0.5" />}
              <div>
                <p className={`font-semibold text-sm ${result.breached ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>
                  {result.message}
                </p>
                {result.breached && result.breaches?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {result.breaches.map(b => (
                      <span key={b} className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs px-2 py-0.5 rounded-full">
                        {b}
                      </span>
                    ))}
                  </div>
                )}
                {result.breached && (
                  <div className="mt-3 space-y-1 text-xs text-red-600 dark:text-red-400">
                    <p>• Change your password on all affected services immediately</p>
                    <p>• Enable two-factor authentication where possible</p>
                    <p>• Monitor your accounts for unusual activity</p>
                  </div>
                )}
                {result.source === 'offline_simulation' && (
                  <p className="text-xs text-gray-400 mt-2">* Simulated result (HIBP API key not configured)</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PDF Report */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-2 mb-1 font-semibold dark:text-white">
          <FileText size={16} className="text-blue-500" /> Fraud Report PDF
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Download a complete PDF report of your flagged transactions, risk scores, and alerts — useful for bank compliance or personal records.
        </p>
        <button onClick={downloadPDF} disabled={pdfLoading}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50">
          {pdfLoading
            ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Download size={14} />}
          {pdfLoading ? 'Generating…' : 'Download PDF Report'}
        </button>
        <p className="text-xs text-gray-400 mt-2">
          Includes: transaction summary, high-risk transactions table, recent alerts, and compliance footer.
        </p>
      </div>
    </div>
  )
}
