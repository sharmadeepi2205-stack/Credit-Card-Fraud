import { useEffect, useState } from 'react'
import api, { errMsg } from '../api/client'
import toast from 'react-hot-toast'
import { CreditCard, Plus, Lock, Unlock, Wifi, ShieldCheck } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import SectionCard from '../components/ui/SectionCard'
import EmptyState from '../components/ui/EmptyState'
import StatusBadge from '../components/ui/StatusBadge'

const STATUS_GRADIENT = {
  ACTIVE:      'from-brand-600 to-brand-800',
  BLOCKED:     'from-slate-600 to-slate-800',
  ONLINE_ONLY: 'from-amber-500 to-amber-700',
}

export default function CardsPage() {
  const [cards, setCards] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ last_four: '', card_type: 'VISA', bin_prefix: '', credit_limit: 5000 })
  const [saving, setSaving] = useState(false)

  const load = () => api.get('/cards').then(r => setCards(r.data)).catch(() => {})
  useEffect(() => { load() }, [])

  const addCard = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await api.post('/cards', form)
      toast.success('Card added successfully')
      setShowForm(false)
      setForm({ last_four: '', card_type: 'VISA', bin_prefix: '', credit_limit: 5000 })
      load()
    } catch (err) { toast.error(errMsg(err)) }
    finally { setSaving(false) }
  }

  const setStatus = async (id, status) => {
    try {
      await api.patch(`/cards/${id}/status`, { status })
      toast.success(`Card ${status.toLowerCase().replace('_', ' ')}`)
      load()
    } catch { toast.error('Failed to update card') }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Cards"
        subtitle={`${cards.length} card${cards.length !== 1 ? 's' : ''} linked`}
        actions={
          <button onClick={() => setShowForm(s => !s)} className="btn-primary btn-sm">
            <Plus size={13} /> Add Card
          </button>
        }
      />

      {/* Add card form */}
      {showForm && (
        <SectionCard title="Link a New Card">
          <form onSubmit={addCard} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Last 4 Digits *</label>
              <input required maxLength={4} value={form.last_four}
                onChange={e => setForm(f => ({ ...f, last_four: e.target.value }))}
                placeholder="4242" className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Card Type</label>
              <select value={form.card_type} onChange={e => setForm(f => ({ ...f, card_type: e.target.value }))}
                className="input">
                {['VISA', 'MASTERCARD', 'AMEX', 'DISCOVER'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">BIN (first 6 digits)</label>
              <input maxLength={6} value={form.bin_prefix}
                onChange={e => setForm(f => ({ ...f, bin_prefix: e.target.value }))}
                placeholder="411111" className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Credit Limit ($)</label>
              <input type="number" value={form.credit_limit}
                onChange={e => setForm(f => ({ ...f, credit_limit: Number(e.target.value) }))}
                className="input" />
            </div>
            <div className="sm:col-span-2 flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                {saving ? 'Adding…' : 'Add Card'}
              </button>
            </div>
          </form>
        </SectionCard>
      )}

      {/* Cards grid */}
      {cards.length === 0 ? (
        <SectionCard>
          <EmptyState icon={CreditCard} title="No cards linked" subtitle="Add a virtual card to start monitoring transactions"
            action={<button onClick={() => setShowForm(true)} className="btn-primary btn-sm"><Plus size={13} /> Add Card</button>} />
        </SectionCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {cards.map(card => (
            <div key={card.id}
              className={`bg-gradient-to-br ${STATUS_GRADIENT[card.status] || STATUS_GRADIENT.ACTIVE} text-white rounded-2xl p-6 shadow-card-hover relative overflow-hidden`}>
              {/* Background pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white" />
                <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-white" />
              </div>

              <div className="relative">
                <div className="flex items-start justify-between mb-8">
                  <CreditCard size={28} className="opacity-90" />
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs bg-white/15 px-2 py-1 rounded-full">
                      <ShieldCheck size={10} /> Tokenized
                    </span>
                    <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">{card.card_type}</span>
                  </div>
                </div>

                <p className="text-xl font-mono tracking-widest mb-1 opacity-95">
                  •••• •••• •••• {card.last_four}
                </p>
                <p className="text-xs opacity-60 mb-5">Limit: ${card.credit_limit.toLocaleString()}</p>

                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    card.status === 'ACTIVE' ? 'bg-white/20 text-white' :
                    card.status === 'BLOCKED' ? 'bg-red-500/30 text-red-100' :
                    'bg-amber-500/30 text-amber-100'
                  }`}>
                    {card.status.replace('_', ' ')}
                  </span>

                  <div className="flex gap-1.5">
                    {card.status !== 'ACTIVE' && (
                      <button onClick={() => setStatus(card.id, 'ACTIVE')}
                        title="Activate" className="flex items-center gap-1 px-2.5 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs transition-colors">
                        <Unlock size={12} /> Unfreeze
                      </button>
                    )}
                    {card.status !== 'ONLINE_ONLY' && (
                      <button onClick={() => setStatus(card.id, 'ONLINE_ONLY')}
                        title="Online Only" className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
                        <Wifi size={13} />
                      </button>
                    )}
                    {card.status !== 'BLOCKED' && (
                      <button onClick={() => setStatus(card.id, 'BLOCKED')}
                        title="Freeze Card" className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500/40 hover:bg-red-500/60 rounded-lg text-xs transition-colors">
                        <Lock size={12} /> Freeze
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
