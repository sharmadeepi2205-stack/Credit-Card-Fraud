/**
 * AlertActions — three big one-tap response buttons for a fraud alert.
 * approve | soft_block | hard_block
 */
import { useState } from 'react'
import { CheckCircle, ShieldAlert, ShieldOff, Loader, ThumbsUp, ThumbsDown } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'

export default function AlertActions({ alertId, onResolved }) {
  const [loading, setLoading] = useState(null)

  const act = async (action) => {
    setLoading(action)
    try {
      await api.post(`/alerts/${alertId}/respond?action=${action}`)
      const msgs = {
        approve: '✅ Marked as safe — transaction approved',
        soft_block: '⚠️ Card restricted to online-only',
        hard_block: '🔒 Card blocked immediately',
      }
      toast.success(msgs[action])
      onResolved?.()
    } catch {
      toast.error('Action failed — please try again')
    } finally {
      setLoading(null)
    }
  }

  const feedback = async (label) => {
    setLoading(label)
    try {
      await api.post(`/alerts/${alertId}/feedback?label=${label}`)
      toast.success('Thanks — your feedback helps improve fraud detection 🙏')
      onResolved?.()
    } catch {
      toast.error('Failed to submit feedback')
    } finally {
      setLoading(null)
    }
  }

  const btn = (action, icon, label, style) => (
    <button onClick={() => act(action)} disabled={!!loading}
      className={`flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl font-medium text-sm transition-all disabled:opacity-40 ${style}`}>
      {loading === action ? <Loader size={18} className="animate-spin" /> : icon}
      <span className="text-xs leading-tight text-center">{label}</span>
    </button>
  )

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {btn('approve', <CheckCircle size={18} />, 'This is me', 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300')}
        {btn('soft_block', <ShieldAlert size={18} />, 'Soft block', 'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/40 dark:text-orange-300')}
        {btn('hard_block', <ShieldOff size={18} />, 'Block card now', 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300')}
      </div>
      <div className="flex gap-2 border-t dark:border-gray-700 pt-2">
        <button onClick={() => feedback('false_positive')} disabled={!!loading}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 disabled:opacity-40">
          <ThumbsUp size={12} /> Not fraud
        </button>
        <button onClick={() => feedback('true_fraud')} disabled={!!loading}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 disabled:opacity-40">
          <ThumbsDown size={12} /> Confirm fraud
        </button>
      </div>
    </div>
  )
}
