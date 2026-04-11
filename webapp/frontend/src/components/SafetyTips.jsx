import { ShieldCheck } from 'lucide-react'
import SectionCard from './ui/SectionCard'

const TIPS = [
  'Never share your OTP or card PIN with anyone — not even bank staff.',
  'Check for the padlock icon (🔒) in your browser before entering card details.',
  'If you get an unexpected alert, freeze your card first, then investigate.',
  'Use virtual card numbers for online shopping when possible.',
  'Review your transaction history weekly to catch anything unusual early.',
]

export default function SafetyTips() {
  return (
    <SectionCard
      title="How to stay safe"
      actions={<ShieldCheck size={16} className="text-risk-low" />}>
      <ul className="space-y-2.5">
        {TIPS.map((tip, i) => (
          <li key={i} className="flex gap-2.5 text-sm text-slate-600 dark:text-slate-300">
            <span className="text-risk-low flex-shrink-0 mt-0.5">✓</span>
            {tip}
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}
