import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api, { errMsg } from '../api/client'
import toast from 'react-hot-toast'
import { ShieldCheck, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [step, setStep] = useState('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [otp, setOtp] = useState('')
  const [devOtp, setDevOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleCredentials = async (e) => {
    e.preventDefault(); setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      if (data.mfa_required) {
        setDevOtp(data.otp_code || '')
        setStep('otp')
        toast.success('OTP ready')
      } else {
        await login(data); navigate('/dashboard')
      }
    } catch (err) { toast.error(errMsg(err)) }
    finally { setLoading(false) }
  }

  const handleOtp = async (e) => {
    e.preventDefault(); setLoading(true)
    try {
      const { data } = await api.post('/auth/verify-otp', { email, otp_code: otp })
      await login(data); navigate('/dashboard')
    } catch (err) { toast.error(errMsg(err)) }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex bg-surface-secondary dark:bg-slate-950">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-600 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <ShieldCheck size={20} className="text-white" />
          </div>
          <span className="text-white font-semibold text-lg">FraudGuard</span>
        </div>
        <div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Protect every transaction with AI
          </h2>
          <p className="text-brand-200 text-lg leading-relaxed">
            Real-time fraud detection powered by machine learning. Monitor, detect, and respond to suspicious activity instantly.
          </p>
        </div>
        <div className="flex gap-6">
          {[['99.3%', 'Detection Rate'], ['<50ms', 'Response Time'], ['0.1%', 'False Positives']].map(([v, l]) => (
            <div key={l}>
              <p className="text-2xl font-bold text-white font-mono">{v}</p>
              <p className="text-brand-200 text-sm">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <ShieldCheck size={16} className="text-white" />
            </div>
            <span className="font-semibold text-slate-900 dark:text-white">FraudGuard</span>
          </div>

          {step === 'credentials' ? (
            <>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-1">Welcome back</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">Sign in to your account</p>
              <form onSubmit={handleCredentials} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} required value={password}
                      onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="input pr-10" />
                    <button type="button" onClick={() => setShowPw(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full btn-lg">
                  {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>
              <p className="text-center text-sm text-slate-500 mt-6">
                No account?{' '}
                <Link to="/register" className="text-brand-600 hover:text-brand-700 font-medium">Create one</Link>
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-1">Verify your identity</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Enter the OTP for <strong>{email}</strong></p>
              {devOtp && (
                <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-700 rounded-xl p-4 text-center mb-6">
                  <p className="text-xs text-brand-500 mb-1">Your OTP code</p>
                  <p className="text-3xl font-mono font-bold tracking-widest text-brand-700 dark:text-brand-300">{devOtp}</p>
                </div>
              )}
              <form onSubmit={handleOtp} className="space-y-4">
                <input type="text" maxLength={6} required value={otp} onChange={e => setOtp(e.target.value)}
                  placeholder="000000"
                  className="input text-center text-2xl tracking-widest font-mono h-14" />
                <button type="submit" disabled={loading} className="btn-primary w-full btn-lg">
                  {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                  {loading ? 'Verifying…' : 'Verify OTP'}
                </button>
              </form>
              <button onClick={() => setStep('credentials')} className="btn-ghost w-full mt-3 text-sm">← Back</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
