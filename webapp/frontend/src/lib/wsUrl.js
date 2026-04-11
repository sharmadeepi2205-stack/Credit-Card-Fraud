/**
 * Build a WebSocket URL that works both locally and on Render.
 * VITE_API_URL = "https://your-backend.onrender.com"
 * → wss://your-backend.onrender.com/ws/...
 * Locally (no env var) → ws://localhost:5173/ws/... (proxied by Vite)
 */
export function wsUrl(path) {
  const apiUrl = import.meta.env.VITE_API_URL
  if (apiUrl) {
    const base = apiUrl.replace(/^http/, 'ws')
    return `${base}${path}`
  }
  // Dev: use current host (Vite proxy handles it)
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}${path}`
}
