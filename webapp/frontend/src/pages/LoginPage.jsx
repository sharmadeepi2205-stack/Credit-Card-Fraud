import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api, { errMsg } from '../api/client'
import toast from 'react-hot-toast'
import { ShieldCheck } from 'lucide-react'

export default function LoginPage() {
  const [step, setStep] = useState('credentials') // 'credentials' | 'otp'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [devOtp, setDevOtp] = useState('')   // shown in UI when email isn't configured
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleCredentials = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      if (data.mfa_required) {
        setDevOtp(data.otp_code || '')
        setStep('otp')
        toast.success('OTP ready — see the code below')
      } else {
        await login(data)
        navigate('/dashboard')
      }
    } catch (err) {
      toast.error(errMsg(err))
    } finally {
      setLoading(false)
    }
  }

  const handleOtp = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/verify-otp', { email, otp_code: otp })
      await login(data)
      navigate('/dashboard')
    } catch (err) {
      toast.error(errMsg(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-900">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6">
          <ShieldCheck className="text-blue-600" size={28} />
          <h1 className="text-2xl font-bold text-gray-900">FraudGuard</h1>
        </div>

        {step === 'credentials' ? (
          <form onSubmit={handleCredentials} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
            <p className="text-center text-sm text-gray-500">
              No account? <Link to="/register" className="text-blue-600 hover:underline">Register</Link>
            </p>
          </form>
        ) : (
          <form onSubmit={handleOtp} className="space-y-4">
            <p className="text-sm text-gray-600">Enter the 6-digit OTP for <strong>{email}</strong></p>
            {devOtp && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-center">
                <p className="text-xs text-blue-500 mb-1">Your OTP code</p>
                <p className="text-3xl font-mono font-bold tracking-widest text-blue-700">{devOtp}</p>
              </div>
            )}
            <input type="text" maxLength={6} required value={otp} onChange={e => setOtp(e.target.value)}
              placeholder="000000"
              className="w-full border rounded-lg px-3 py-2 text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Verifying…' : 'Verify OTP'}
            </button>
            <button type="button" onClick={() => setStep('credentials')}
              className="w-full text-sm text-gray-500 hover:text-gray-700">← Back</button>
          </form>
        )}
      </div>
    </div>
  )
}
