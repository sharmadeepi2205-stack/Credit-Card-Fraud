/**
 * User UI preferences: DND quiet hours, language (en/hi), onboarding seen.
 * Stored in localStorage — no backend needed.
 */
import { createContext, useContext, useState } from 'react'

const PrefsContext = createContext()

const DEFAULTS = {
  dndEnabled: false,
  dndStart: '22:00',
  dndEnd: '08:00',
  lang: 'en',
  onboardingDone: false,
}

export function PrefsProvider({ children }) {
  const [prefs, setPrefs] = useState(() => {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('prefs') || '{}') } }
    catch { return DEFAULTS }
  })

  const update = (patch) => {
    setPrefs(p => {
      const next = { ...p, ...patch }
      localStorage.setItem('prefs', JSON.stringify(next))
      return next
    })
  }

  // Check if currently in DND window
  const isDND = () => {
    if (!prefs.dndEnabled) return false
    const now = new Date()
    const [sh, sm] = prefs.dndStart.split(':').map(Number)
    const [eh, em] = prefs.dndEnd.split(':').map(Number)
    const cur = now.getHours() * 60 + now.getMinutes()
    const start = sh * 60 + sm
    const end = eh * 60 + em
    return start > end ? (cur >= start || cur < end) : (cur >= start && cur < end)
  }

  return (
    <PrefsContext.Provider value={{ prefs, update, isDND }}>
      {children}
    </PrefsContext.Provider>
  )
}

export const usePrefs = () => useContext(PrefsContext)
