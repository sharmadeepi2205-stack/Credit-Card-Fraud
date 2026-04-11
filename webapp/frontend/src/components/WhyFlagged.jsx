import { Info } from 'lucide-react'

const TIPS = [
  { match: /burst|rapid|multiple/i, plain: 'Several transactions happened in a very short time — this is unusual.' },
  { match: /travel|velocity|location|country/i, plain: 'The transaction location is far from your usual area.' },
  { match: /device|fingerprint|unrecognized/i, plain: 'This came from a device we haven\'t seen before.' },
  { match: /amount|large|high.value/i, plain: 'The amount is much higher than your usual spending.' },
  { match: /mismatch|bin/i, plain: 'Your card was issued in a different country than where this transaction happened.' },
  { match: /pattern|behavior|unusual/i, plain: 'This doesn\'t match your normal spending habits.' },
]

function toPlain(reason) {
  if (!reason) return 'Our system detected a combination of unusual signals on this transaction.'
  const matched = TIPS.filter(t => t.match.test(reason)).map(t => t.plain)
  return matched.length ? matched.join(' ') : reason
}

export default function WhyFlagged({ reason, score, riskLevel }) {
  return (
    <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-medium text-sm">
        <Info size={15} /> Why was this flagged?
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300">{toPlain(reason)}</p>
      {score != null && (
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div className={`h-1.5 rounded-full ${riskLevel === 'HIGH' ? 'bg-red-500' : riskLevel === 'MEDIUM' ? 'bg-orange-400' : 'bg-green-500'}`}
              style={{ width: `${Math.min(score, 100)}%` }} />
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">Risk score: {Number(score).toFixed(0)}/100</span>
        </div>
      )}
    </div>
  )
}
