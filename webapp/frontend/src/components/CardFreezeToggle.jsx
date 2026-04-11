/**
 * CardFreezeToggle — instant freeze/unfreeze switch shown in the dashboard top bar.
 */
import { useState } from 'react'
import { Lock, Unlock, Loader } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'

export default function CardFreezeToggle({ card, onToggled }) {
  const [loading, setLoading] = useState(false)
  if (!card) return null

  const frozen = card.status === 'BLOCKED'

  const toggle = async () => {
    setLoading(true)
    try {
      await api.post(`/cards/${card.id}/toggle-freeze`)
      toast.success(frozen ? 'Card unfrozen — transactions allowed' : 'Card frozen — all transactions blocked')
      onToggled()
    } catch {
      toast.error('Failed to update card status')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button onClick={toggle} disabled={loading}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
        frozen
          ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300'
          : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300'
      } disabled:opacity-50`}>
      {loading ? <Loader size={14} className="animate-spin" />
        : frozen ? <Lock size={14} /> : <Unlock size={14} />}
      {frozen ? 'Card frozen' : 'Card active'}
      {/* Toggle switch visual */}
      <span className={`ml-1 w-8 h-4 rounded-full relative transition-colors ${frozen ? 'bg-red-400' : 'bg-green-400'}`}>
        <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${frozen ? 'left-0.5' : 'left-4'}`} />
      </span>
    </button>
  )
}
