import { useState } from 'react'
import api from '../api/client'
import toast from 'react-hot-toast'
import { Play, Zap, CreditCard, User, Globe, Smartphone } from 'lucide-react'
import RiskBar from '../components/RiskBar'

const SCENARIOS = [
  {
    id: 'card_skimming',
    name: 'Card Skimming Attack',
    icon: CreditCard,
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    description: 'Simulates a skimmed card being used at multiple ATMs in rapid succession across different countries.',
    transactions: [
      { amount: 200, merchant_name: 'ATM Withdrawal', merchant_category: 'Cash', country: 'RU', device_id: 'atm-001' },
      { amount: 200, merchant_name: 'ATM Withdrawal', merchant_category: 'Cash', country: 'RU', device_id: 'atm-002' },
      { amount: 500, merchant_name: 'ATM Withdrawal', merchant_category: 'Cash', country: 'NG', device_id: 'atm-003' },
      { amount: 1000, merchant_name: 'Wire Transfer', merchant_category: 'Finance', country: 'CN', device_id: 'new-device-x' },
    ],
  },
  {
    id: 'account_takeover',
    name: 'Account Takeover',
    icon: User,
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    description: 'Attacker gains access and immediately changes spending patterns — large purchases from new devices.',
    transactions: [
      { amount: 3500, merchant_name: 'Luxury Goods', merchant_category: 'Shopping', country: 'AE', device_id: 'hacked-device-1' },
      { amount: 1200, merchant_name: 'CryptoExchange', merchant_category: 'Crypto', country: 'CN', device_id: 'hacked-device-1' },
      { amount: 800, merchant_name: 'Gift Cards', merchant_category: 'Shopping', country: 'US', device_id: 'hacked-device-2' },
    ],
  },
  {
    id: 'cnp_fraud',
    name: 'Card-Not-Present (CNP) Fraud',
    icon: Globe,
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    description: 'Stolen card details used for online purchases — multiple small transactions to test the card before a large one.',
    transactions: [
      { amount: 1.00, merchant_name: 'Test Merchant', merchant_category: 'Other', country: 'RO', device_id: 'bot-001' },
      { amount: 5.00, merchant_name: 'Test Merchant', merchant_category: 'Other', country: 'RO', device_id: 'bot-001' },
      { amount: 49.99, merchant_name: 'Online Store', merchant_category: 'Shopping', country: 'RO', device_id: 'bot-001' },
      { amount: 2499.99, merchant_name: 'Electronics Store', merchant_category: 'Electronics', country: 'RO', device_id: 'bot-001' },
    ],
  },
  {
    id: 'velocity_attack',
    name: 'Velocity / Burst Attack',
    icon: Zap,
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    description: 'Rapid-fire transactions in under a minute — classic sign of automated fraud or card testing.',
    transactions: [
      { amount: 99, merchant_name: 'Online Casino', merchant_category: 'Gambling', country: 'MT', device_id: 'bot-fast' },
      { amount: 99, merchant_name: 'Online Casino', merchant_category: 'Gambling', country: 'MT', device_id: 'bot-fast' },
      { amount: 99, merchant_name: 'Online Casino', merchant_category: 'Gambling', country: 'MT', device_id: 'bot-fast' },
      { amount: 99, merchant_name: 'Online Casino', merchant_category: 'Gambling', country: 'MT', device_id: 'bot-fast' },
      { amount: 99, merchant_name: 'Online Casino', merchant_category: 'Gambling', country: 'MT', device_id: 'bot-fast' },
    ],
  },
  {
    id: 'impossible_travel',
    name: 'Impossible Travel',
    icon: Smartphone,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    description: 'Card used in Mumbai, then Paris 10 minutes later — physically impossible.',
    transactions: [
      { amount: 45, merchant_name: 'Starbucks Mumbai', merchant_category: 'Food & Drink', country: 'IN', latitude: 19.07, longitude: 72.87 },
      { amount: 320, merchant_name: 'Paris Boutique', merchant_category: 'Shopping', country: 'FR', latitude: 48.85, longitude: 2.35 },
      { amount: 890, merchant_name: 'Luxury Hotel Paris', merchant_category: 'Travel', country: 'FR', latitude: 48.86, longitude: 2.34 },
    ],
  },
]

function ScoreCard({ txn, result, index }) {
  const risk = result?.risk_level || 'LOW'
  const score = result?.fraud_score || 0
  const color = risk === 'HIGH' ? 'border-red-400 bg-red-50 dark:bg-red-900/10'
    : risk === 'MEDIUM' ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/10'
    : 'border-green-400 bg-green-50 dark:bg-green-900/10'

  return (
    <div className={`border-l-4 rounded-xl p-4 transition-all ${color} ${result ? 'opacity-100' : 'opacity-40'}`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="font-medium text-sm dark:text-white">{txn.merchant_name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">${txn.amount} · {txn.country}</p>
        </div>
        {result && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
            risk === 'HIGH' ? 'bg-red-100 text-red-700' : risk === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
          }`}>{risk}</span>
        )}
      </div>
      {result && (
        <>
          <RiskBar score={score} riskLevel={risk} />
          {result.reason && result.reason !== 'Automated risk assessment' && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">{result.reason}</p>
          )}
        </>
      )}
    </div>
  )
}

export default function SimulationPage() {
  const [selected, setSelected] = useState(null)
  const [results, setResults] = useState([])
  const [running, setRunning] = useState(false)
  const [step, setStep] = useState(-1)

  const runScenario = async (scenario) => {
    setSelected(scenario)
    setResults([])
    setStep(-1)
    setRunning(true)

    const res = []
    for (let i = 0; i < scenario.transactions.length; i++) {
      setStep(i)
      try {
        const { data } = await api.post('/predict', scenario.transactions[i])
        res.push(data)
        setResults([...res])
      } catch {
        res.push({ fraud_score: 0, risk_level: 'LOW', reason: 'Error' })
        setResults([...res])
      }
      await new Promise(r => setTimeout(r, 600))
    }
    setStep(-1)
    setRunning(false)

    const highCount = res.filter(r => r.risk_level === 'HIGH').length
    if (highCount > 0) {
      toast.custom(() => (
        <div className="bg-red-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2">
          <Zap size={16} /> {highCount} HIGH RISK transaction(s) detected!
        </div>
      ), { duration: 4000 })
    } else {
      toast.success('Simulation complete — no high-risk transactions detected')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
          <Zap size={22} className="text-amber-500" /> Fraud Simulation Sandbox
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Simulate real fraud attack scenarios and watch the ML model detect them in real time
        </p>
      </div>

      {/* Scenario cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SCENARIOS.map(s => {
          const Icon = s.icon
          const isActive = selected?.id === s.id
          return (
            <button key={s.id} onClick={() => !running && runScenario(s)}
              disabled={running}
              className={`text-left p-5 rounded-2xl border-2 transition-all hover:shadow-md disabled:cursor-not-allowed ${
                isActive
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 hover:border-blue-300'
              }`}>
              <div className={`inline-flex p-2 rounded-lg mb-3 ${s.color}`}>
                <Icon size={18} />
              </div>
              <h3 className="font-semibold text-sm dark:text-white mb-1">{s.name}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{s.description}</p>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs text-gray-400">{s.transactions.length} transactions</span>
                {isActive && running && (
                  <span className="flex items-center gap-1 text-xs text-blue-600">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" /> Running…
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Results */}
      {selected && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold dark:text-white">{selected.name} — Results</h2>
            {!running && results.length > 0 && (
              <div className="flex gap-3 text-xs">
                <span className="text-red-600 font-medium">{results.filter(r => r.risk_level === 'HIGH').length} HIGH</span>
                <span className="text-amber-600 font-medium">{results.filter(r => r.risk_level === 'MEDIUM').length} MEDIUM</span>
                <span className="text-green-600 font-medium">{results.filter(r => r.risk_level === 'LOW').length} LOW</span>
              </div>
            )}
          </div>
          <div className="space-y-3">
            {selected.transactions.map((txn, i) => (
              <div key={i} className="relative">
                {step === i && (
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-full animate-pulse" />
                )}
                <ScoreCard txn={txn} result={results[i]} index={i} />
              </div>
            ))}
          </div>
        </div>
      )}

      {!selected && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <Play size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">Select a scenario above to start the simulation</p>
        </div>
      )}
    </div>
  )
}
