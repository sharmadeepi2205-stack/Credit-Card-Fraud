import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api, { errMsg } from '../api/client'
import toast from 'react-hot-toast'
import { ShieldCheck } from 'lucide-react'

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', full_name: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true)
    try {
      await api.post('/auth/register', form)
      toast.success('Account created! Please sign in.')
      navigate('/login')
    } catch (err) { toast.error(errMsg(err)) }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex bg-surface-secondary dark:bg-slate-950">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center">
            <ShieldCheck size={20} className="text-white" />
          </div>
          <span className="text-white font-semibold text-lg">FraudGuard</span>
        </div>
        <div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Start protecting your finances today
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed">
            Join thousands of users who trust FraudGuard to monitor their transactions and keep their cards safe.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            ['Real-time alerts', 'Get notified the moment suspicious activity is detected'],
            ['AI-powered', 'Machine learning models trained on millions of transactions'],
            ['Card controls', 'Freeze, geo-lock, and set spend limits instantly'],
            ['Full transparency', 'See exactly why every transaction was flagged'],
          ].map(([t, d]) => (
            <div key={t} className="bg-white/5 rounded-xl p-4">
              <p className="text-white font-medium text-sm mb-1">{t}</p>
              <p className="text-slate-400 text-xs">{d}</p>
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

          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-1">Create your account</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">Free to use — no credit card required</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: 'Full Name', key: 'full_name', type: 'text', placeholder: 'Deepika Sharma' },
              { label: 'Email', key: 'email', type: 'email', placeholder: 'you@example.com' },
              { label: 'Password', key: 'password', type: 'password', placeholder: '8+ characters' },
              { label: 'Phone (optional)', key: 'phone', type: 'tel', placeholder: '+91 98765 43210' },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>
                <input type={type} value={form[key]} onChange={set(key)}
                  required={key !== 'phone'} placeholder={placeholder} className="input" />
              </div>
            ))}
            <button type="submit" disabled={loading} className="btn-primary w-full btn-lg">
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 hover:text-brand-700 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
