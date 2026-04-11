import { useState } from 'react'
import { ShieldCheck, AlertTriangle, CheckCircle, X } from 'lucide-react'
import { usePrefs } from '../context/PrefsContext'

const STEPS = [
  {
    icon: ShieldCheck,
    title: 'Welcome to FraudGuard',
    body: 'We monitor your card transactions in real-time and alert you the moment something looks suspicious — so you\'re always in control.',
  },
  {
    icon: AlertTriangle,
    title: 'Understanding Risk Levels',
    body: (
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2"><span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">Low</span> Transaction looks normal. No action needed.</div>
        <div className="flex items-center gap-2"><span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-medium">Medium</span> Something is slightly unusual. Keep an eye on it.</div>
        <div className="flex items-center gap-2"><span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">High</span> Likely suspicious. We recommend reviewing immediately.</div>
      </div>
    ),
  },
  {
    icon: CheckCircle,
    title: 'What to do with alerts',
    body: 'On the Alerts page you can tap "This is me" to confirm a transaction is yours, "Block payment" to stop it, or "False positive" if we got it wrong. You can also freeze your card instantly from the Cards page.',
  },
]

export default function OnboardingTour() {
  const { prefs, update } = usePrefs()
  const [step, setStep] = useState(0)

  if (prefs.onboardingDone) return null

  const { icon: Icon, title, body } = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-7 relative">
        <button onClick={() => update({ onboardingDone: true })}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center gap-4">
          <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-full">
            <Icon size={28} className="text-blue-600 dark:text-blue-300" />
          </div>
          <h2 className="text-xl font-bold dark:text-white">{title}</h2>
          <div className="text-gray-500 dark:text-gray-300 text-sm leading-relaxed">{body}</div>
        </div>

        {/* Step dots */}
        <div className="flex justify-center gap-2 mt-6">
          {STEPS.map((_, i) => (
            <span key={i} className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-blue-600' : 'bg-gray-200'}`} />
          ))}
        </div>

        <div className="flex gap-3 mt-6">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              className="flex-1 border rounded-lg py-2 text-sm hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300">
              Back
            </button>
          )}
          <button onClick={() => isLast ? update({ onboardingDone: true }) : setStep(s => s + 1)}
            className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700">
            {isLast ? 'Get started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
