import { ShieldCheck } from 'lucide-react'

const TIPS = [
  'Never share your OTP or card PIN with anyone — not even bank staff.',
  'Check for the padlock icon (🔒) in your browser before entering card details.',
  'If you get an unexpected alert, freeze your card first, then investigate.',
  'Use virtual card numbers for online shopping when possible.',
  'Review your transaction history weekly to catch anything unusual early.',
]

export default function SafetyTips() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4 font-semibold text-gray-800 dark:text-white">
        <ShieldCheck size={18} className="text-green-600" /> How to stay safe
      </div>
      <ul className="space-y-2">
        {TIPS.map((tip, i) => (
          <li key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span className="text-green-500 shrink-0">✓</span> {tip}
          </li>
        ))}
      </ul>
    </div>
  )
}
