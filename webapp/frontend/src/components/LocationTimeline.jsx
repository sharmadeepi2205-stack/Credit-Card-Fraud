/**
 * LocationTimeline — shows recent transaction locations as a timeline.
 * No external map library needed — uses a simple visual list with country flags.
 */
import { MapPin, AlertTriangle } from 'lucide-react'

const FLAG = { US: '🇺🇸', GB: '🇬🇧', DE: '🇩🇪', FR: '🇫🇷', CN: '🇨🇳', RU: '🇷🇺', BR: '🇧🇷', IN: '🇮🇳', AU: '🇦🇺', JP: '🇯🇵' }

export default function LocationTimeline({ txns }) {
  // Get last 8 transactions that have a country
  const located = txns.filter(t => t.country).slice(0, 8)
  if (!located.length) return null

  // Detect suspicious: country appears only once and risk is HIGH
  const countryCounts = {}
  located.forEach(t => { countryCounts[t.country] = (countryCounts[t.country] || 0) + 1 })

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4 font-semibold text-gray-800 dark:text-white text-sm">
        <MapPin size={16} className="text-blue-500" /> Transaction Locations
      </div>
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-100 dark:bg-gray-700" />
        <div className="space-y-3">
          {located.map((t, i) => {
            const suspicious = t.risk_level === 'HIGH' || (countryCounts[t.country] === 1 && t.risk_level === 'MEDIUM')
            return (
              <div key={t.id} className="flex items-start gap-3 pl-2">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 z-10 text-xs ${suspicious ? 'bg-red-100 dark:bg-red-900/40' : 'bg-blue-100 dark:bg-blue-900/40'}`}>
                  {suspicious ? <AlertTriangle size={10} className="text-red-600" /> : <span className="text-blue-600">·</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{FLAG[t.country] || '🌍'}</span>
                    <span className="text-xs font-medium dark:text-white">{t.country}</span>
                    {suspicious && <span className="text-xs bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 px-1.5 rounded-full">Unusual location</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t.merchant_name || 'Unknown'} · ${Number(t.amount).toFixed(2)}
                  </p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
