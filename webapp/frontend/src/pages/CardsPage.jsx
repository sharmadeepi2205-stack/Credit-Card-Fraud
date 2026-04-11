import { useEffect, useState } from 'react'
import api, { errMsg } from '../api/client'
import toast from 'react-hot-toast'
import { CreditCard, Plus, Lock, Unlock, Wifi, ShieldCheck } from 'lucide-react'
import { useT } from '../i18n'

const STATUS_COLOR = {
  ACTIVE: 'text-green-600',
  BLOCKED: 'text-red-600',
  ONLINE_ONLY: 'text-orange-500',
}

export default function CardsPage() {
  const [cards, setCards] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ last_four: '', card_type: 'VISA', bin_prefix: '', credit_limit: 5000 })
  const tr = useT()

  const load = () => api.get('/cards').then(r => setCards(r.data))
  useEffect(() => { load() }, [])

  const addCard = async (e) => {
    e.preventDefault()
    try {
      await api.post('/cards', form)
      toast.success('Card added')
      setShowForm(false)
      load()
    } catch (err) {
      toast.error(errMsg(err))
    }
  }

  const setStatus = async (id, status) => {
    try {
      await api.patch(`/cards/${id}/status`, { status })
      toast.success(`Card ${status.toLowerCase()}`)
      load()
    } catch {
      toast.error('Failed to update card')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Cards</h1>
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700">
          <Plus size={14} /> Add Card
        </button>
      </div>

      {showForm && (
        <form onSubmit={addCard} className="bg-white rounded-xl shadow-sm p-5 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Last 4 Digits</label>
            <input required maxLength={4} value={form.last_four}
              onChange={e => setForm(f => ({ ...f, last_four: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Card Type</label>
            <select value={form.card_type} onChange={e => setForm(f => ({ ...f, card_type: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm">
              {['VISA', 'MASTERCARD', 'AMEX', 'DISCOVER'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">BIN (first 6 digits)</label>
            <input maxLength={6} value={form.bin_prefix}
              onChange={e => setForm(f => ({ ...f, bin_prefix: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="411111" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Credit Limit ($)</label>
            <input type="number" value={form.credit_limit}
              onChange={e => setForm(f => ({ ...f, credit_limit: Number(e.target.value) }))}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="col-span-2 flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Add Card
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map(card => (
          <div key={card.id} className="bg-gradient-to-br from-blue-700 to-blue-900 text-white rounded-2xl p-5 shadow-lg">
            <div className="flex justify-between items-start mb-6">
              <CreditCard size={28} />
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs bg-white/10 px-2 py-1 rounded-full">
                  <ShieldCheck size={11} /> Tokenized
                </span>
                <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">{card.card_type}</span>
              </div>
            </div>
            <p className="text-xl font-mono tracking-widest mb-1">•••• •••• •••• {card.last_four}</p>
            <p className="text-xs text-blue-200">Limit: ${card.credit_limit.toLocaleString()}</p>
            <div className="flex items-center justify-between mt-4">
              <span className={`text-xs font-semibold ${STATUS_COLOR[card.status]} bg-white/10 px-2 py-1 rounded-full`}>
                {card.status}
              </span>
              <div className="flex gap-2">
                {card.status !== 'ACTIVE' && (
                  <button onClick={() => setStatus(card.id, 'ACTIVE')}
                    title={tr('unfreezeCard')} className="flex items-center gap-1 px-2 py-1 bg-white/20 rounded-lg hover:bg-white/30 text-xs">
                    <Unlock size={12} /> {tr('unfreezeCard')}
                  </button>
                )}
                {card.status !== 'ONLINE_ONLY' && (
                  <button onClick={() => setStatus(card.id, 'ONLINE_ONLY')}
                    title="Online Only" className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30">
                    <Wifi size={14} />
                  </button>
                )}
                {card.status !== 'BLOCKED' && (
                  <button onClick={() => setStatus(card.id, 'BLOCKED')}
                    title={tr('freezeCard')} className="flex items-center gap-1 px-2 py-1 bg-red-500/60 rounded-lg hover:bg-red-500/80 text-xs">
                    <Lock size={12} /> {tr('freezeCard')}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {cards.length === 0 && (
          <p className="text-gray-400 text-sm col-span-2 text-center py-10">No cards linked yet</p>
        )}
      </div>
    </div>
  )
}
