import { useEffect, useState } from 'react'
import api from '../api/client'
import toast from 'react-hot-toast'
import { Shield, Globe, MapPin, DollarSign, Store, Lock, Unlock } from 'lucide-react'

const COUNTRIES = ['US','GB','DE','FR','IN','AU','CA','JP','SG','AE','BR','MX','ZA','NG','RU','CN','PK','RO']
const CATEGORIES = ['Shopping','Food & Drink','Grocery','Transport','Streaming','Electronics','Fuel','Travel','Finance','Cash','Gaming','Gambling','Crypto']

function Toggle({ checked, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium dark:text-white">{label}</p>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
      </div>
      <button onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  )
}

export default function SecurityPage() {
  const [settings, setSettings] = useState(null)
  const [cards, setCards] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/security').then(r => setSettings(r.data)).catch(() => {})
    api.get('/cards').then(r => setCards(r.data)).catch(() => {})
  }, [])

  const save = async (patch) => {
    setSaving(true)
    try {
      const { data } = await api.put('/security', patch)
      setSettings(data)
      toast.success('Settings saved')
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  const toggleCountry = (code) => {
    const list = settings.geo_allowlist || []
    const next = list.includes(code) ? list.filter(c => c !== code) : [...list, code]
    save({ geo_allowlist: next })
  }

  const toggleMerchant = (m) => {
    const list = settings.trusted_merchants || []
    const next = list.includes(m) ? list.filter(x => x !== m) : [...list, m]
    save({ trusted_merchants: next })
  }

  const updateSpendLimit = (cat, val) => {
    const limits = { ...(settings.spend_limits || {}), [cat]: parseFloat(val) || 0 }
    save({ spend_limits: limits })
  }

  const freezeCard = async (id, freeze) => {
    try {
      await api[freeze ? 'post' : 'post'](`/security/${freeze ? 'freeze' : 'unfreeze'}/${id}`)
      toast.success(freeze ? 'Card frozen' : 'Card unfrozen')
      api.get('/cards').then(r => setCards(r.data))
    } catch { toast.error('Failed') }
  }

  if (!settings) return (
    <div className="space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold dark:text-white">Security Controls</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your card security and fraud prevention settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card freeze */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-4 font-semibold dark:text-white">
            <Lock size={16} className="text-blue-500" /> Card Controls
          </div>
          <div className="space-y-3">
            {cards.map(card => (
              <div key={card.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div>
                  <p className="text-sm font-medium dark:text-white">•••• {card.last_four}</p>
                  <p className="text-xs text-gray-500">{card.card_type} · {card.status}</p>
                </div>
                <button
                  onClick={() => freezeCard(card.id, card.status === 'ACTIVE')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    card.status === 'BLOCKED'
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}>
                  {card.status === 'BLOCKED' ? <><Unlock size={12} /> Unfreeze</> : <><Lock size={12} /> Freeze</>}
                </button>
              </div>
            ))}
            {cards.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No cards linked</p>}
          </div>
        </div>

        {/* Travel & OTP */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-4 font-semibold dark:text-white">
            <MapPin size={16} className="text-blue-500" /> Travel & Verification
          </div>
          <div className="divide-y dark:divide-gray-700">
            <Toggle
              checked={settings.travel_mode}
              onChange={v => save({ travel_mode: v })}
              label="Travel Mode"
              description="Temporarily allow international transactions" />
            <div className="py-3">
              <p className="text-sm font-medium dark:text-white mb-2">OTP Threshold</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Require OTP for transactions above this amount
              </p>
              <div className="flex items-center gap-3">
                <input type="range" min="0" max="5000" step="100"
                  value={settings.otp_threshold || 1000}
                  onChange={e => setSettings(s => ({ ...s, otp_threshold: +e.target.value }))}
                  onMouseUp={e => save({ otp_threshold: +e.target.value })}
                  className="flex-1 accent-blue-600" />
                <span className="text-sm font-mono font-semibold dark:text-white w-20 text-right">
                  ${settings.otp_threshold || 1000}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Geo allowlist */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-4 font-semibold dark:text-white">
            <Globe size={16} className="text-blue-500" /> Geo-Lock
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Only allow transactions from these countries. Uncheck to block.
          </p>
          <div className="grid grid-cols-4 gap-2">
            {COUNTRIES.map(code => {
              const allowed = (settings.geo_allowlist || []).includes(code)
              return (
                <button key={code} onClick={() => toggleCountry(code)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    allowed
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-blue-400'
                  }`}>
                  {code}
                </button>
              )
            })}
          </div>
        </div>

        {/* Spend limits */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-4 font-semibold dark:text-white">
            <DollarSign size={16} className="text-blue-500" /> Daily Spend Limits
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Set $0 to block a category entirely.</p>
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {CATEGORIES.map(cat => (
              <div key={cat} className="flex items-center justify-between gap-3">
                <span className="text-sm dark:text-gray-300 w-32 shrink-0">{cat}</span>
                <input type="number" min="0" step="50"
                  defaultValue={(settings.spend_limits || {})[cat] ?? ''}
                  placeholder="No limit"
                  onBlur={e => updateSpendLimit(cat, e.target.value)}
                  className="w-full border dark:border-gray-600 rounded-lg px-2 py-1 text-sm dark:bg-gray-700 dark:text-white text-right focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
            ))}
          </div>
        </div>

        {/* Trusted merchants */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4 font-semibold dark:text-white">
            <Store size={16} className="text-blue-500" /> Trusted Merchants
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Transactions from these merchants skip extra verification checks.
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {(settings.trusted_merchants || []).map(m => (
              <span key={m} className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-sm">
                {m}
                <button onClick={() => toggleMerchant(m)} className="text-blue-400 hover:text-blue-600 font-bold">×</button>
              </span>
            ))}
          </div>
          <form onSubmit={e => { e.preventDefault(); const v = e.target.merchant.value.trim(); if (v) { toggleMerchant(v); e.target.reset() } }}
            className="flex gap-2">
            <input name="merchant" placeholder="Add merchant name…"
              className="flex-1 border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Add</button>
          </form>
        </div>
      </div>
    </div>
  )
}
