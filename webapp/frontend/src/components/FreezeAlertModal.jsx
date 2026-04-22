import { useEffect, useState } from 'react'
import { ShieldAlert, ShieldOff, CheckCircle, X, AlertTriangle, MapPin, CreditCard } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'
import { useAlerts } from '../context/AlertsContext'

export default function FreezeAlertModal() {
  const { freezeAlert, dismissFreezeAlert } = useAlerts()
  const [acting, setActing] = useState(false)
  const [done, setDone] = useState(null) // 'frozen' | 'dismissed'

  // Reset done state when a new alert arrives
  useEffect(() => {
    if (freezeAlert) setDone(null)
  }, [freezeAlert])

  if (!freezeAlert || done) return null

  const score = Number(freezeAlert.fraud_score || 0).toFixed(1)
  const amount = Number(freezeAlert.amount || 0).toFixed(2)

  const handleFreeze = async () => {
    setActing(true)
    try {
      await api.post(`/alerts/${freezeAlert.alert_id}/block-card`)
      toast.success('Card frozen — no further transactions allowed')
      setDone('frozen')
      dismissFreezeAlert()
    } catch {
      toast.error('Failed to freeze card — please go to Alerts page')
    } finally {
      setActing(false)
    }
  }

  const handleDismiss = () => {
    setDone('dismissed')
    dismissFreezeAlert()
  }

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)' }}>

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">

        {/* Red header bar */}
        <div className="bg-red-600 px-6 py-5 flex items-start gap-4">
          <div className="bg-white/20 rounded-full p-2 flex-shrink-0">
            <ShieldAlert size={28} className="text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">
              ⚠️ Suspicious Activity Detected
            </h2>
            <p className="text-red-100 text-sm mt-0.5">
              We recommend freezing your card immediately
            </p>
          </div>
          <button onClick={handleDismiss}
            className="ml-auto text-white/70 hover:text-white flex-shrink-0 mt-0.5">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">

          {/* Fraud score pill */}
          <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-600" />
              <span className="text-sm font-semibold text-red-700 dark:text-red-300">Fraud Score</span>
            </div>
            <span className="text-2xl font-black text-red-600">{score}<span className="text-sm font-normal">/100</span></span>
          </div>

          {/* Transaction details */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <CreditCard size={15} className="text-gray-400 flex-shrink-0" />
              <span className="text-gray-500 dark:text-gray-400 w-24 flex-shrink-0">Merchant</span>
              <span className="font-medium text-gray-900 dark:text-white truncate">{freezeAlert.merchant_name}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="w-4 h-4 flex-shrink-0 text-center text-gray-400 font-bold text-xs">$</span>
              <span className="text-gray-500 dark:text-gray-400 w-24 flex-shrink-0">Amount</span>
              <span className="font-bold text-gray-900 dark:text-white">${amount}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <MapPin size={15} className="text-gray-400 flex-shrink-0" />
              <span className="text-gray-500 dark:text-gray-400 w-24 flex-shrink-0">Country</span>
              <span className="font-medium text-gray-900 dark:text-white">{freezeAlert.country}</span>
            </div>
          </div>

          {/* Reason */}
          {freezeAlert.reason && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">Why we flagged this</p>
              <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">{freezeAlert.reason}</p>
            </div>
          )}

          {/* Scenario label */}
          {freezeAlert.scenario && (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
              Scenario: <span className="font-medium">{freezeAlert.scenario}</span>
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={handleFreeze}
            disabled={acting}
            className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors text-sm">
            <ShieldOff size={16} />
            {acting ? 'Freezing…' : 'Freeze Card Now'}
          </button>
          <button
            onClick={handleDismiss}
            disabled={acting}
            className="flex-1 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold py-3 rounded-xl transition-colors text-sm">
            <CheckCircle size={16} />
            It was me
          </button>
        </div>
      </div>
    </div>
  )
}
