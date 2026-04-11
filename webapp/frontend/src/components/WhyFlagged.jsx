import { Info } from 'lucide-react'

const TIPS = [
  { match: /burst|rapid|multiple/i, plain: 'Several transactions happened in a very short time — this is unusual.' },
  { match: /travel|velocity|location|country/i, plain: 'The transaction location is far from your usual area.' },
  { match: /device|fingerprint|unrecognized/i, plain: "This came from a device we haven't seen before." },
  { match: /amount|large|high.value/i, plain: 'The amount is much higher than your usual spending.' },
  { match: /mismatch|bin/i, plain: 'Your card was issued in a different country than where this transaction happened.' },
  { match: /pattern|behavior|unusual/i, plain: "This doesn't match your normal spending habits." },
]

function toPlain(reason) {
  if (!reason) return 'Our system detected a combination of unusual signals on this transaction.'
  const matched = TIPS.filter(t => t.match.test(reason)).map(t => t.plain)
  return matched.length ? matched.join(' ') : reason
}

export default function WhyFlagged({ reason, score, riskLevel }) {
  const color = riskLevel === 'HIGH' ? 'border-risk-high bg-risk-high-bg' :
                riskLevel === 'MEDIUM' ? 'border-risk-medium bg-risk-medium-bg' :
                'border-risk-low bg-risk-low-bg'
  const textColor = riskLevel === 'HIGH' ? 'text-risk-high' :
                    riskLevel === 'MEDIUM' ? 'text-risk-medium' : 'text-risk-low'

  return (
    <div className={`border rounded-xl p-4 space-y-3 ${color}`}>
      <div className={`flex items-center gap-2 font-medium text-sm ${textColor}`}>
        <Info size={14} /> Why was this flagged?
      </div>
      <p className="text-sm text-slate-700 dark:text-slate-300">{toPlain(reason)}</p>
      {score != null && (
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-white/60 dark:bg-slate-700/60 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full ${riskLevel === 'HIGH' ? 'bg-risk-high' : riskLevel === 'MEDIUM' ? 'bg-risk-medium' : 'bg-risk-low'}`}
              style={{ width: `${Math.min(score, 100)}%` }}
            />
          </div>
          <span className="text-xs text-slate-500 flex-shrink-0 font-mono">
            {Number(score).toFixed(0)}/100
          </span>
        </div>
      )}
    </div>
  )
}
