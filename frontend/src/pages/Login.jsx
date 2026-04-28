import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Shield, Smartphone } from 'lucide-react'
import { authApi } from '../services/api'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'
import { Button, Input } from '../components/ui'

const ROLE_HOME = {
  SYSTEM_ADMIN       : '/admin/dashboard',
  LECTURER           : '/lecturer/dashboard',
  PROGRAMME_DIRECTOR : '/director/dashboard',
  STUDENT            : '/student/dashboard',
}

const BG_IMAGES = [
  'https://images.unsplash.com/photo-1562774053-701939374585?w=1200&q=80', // library interior
  'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&q=80', // campus aerial
  'https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=1200&q=80', // lecture hall
]

const BG = BG_IMAGES[0]

export default function Login() {
  const navigate    = useNavigate()
  const { setAuth } = useAuthStore()

  const [step, setStep]       = useState('credentials')
  const [userId, setUserId]   = useState('')
  const [isStudent, setIsStudent] = useState(false)
  const [qrCode, setQrCode]   = useState('')
  const [code, setCode]       = useState('')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw]   = useState(false)
  const [form, setForm]       = useState({ email: '', password: '' })

  const handleCredentials = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await authApi.login(form.email, form.password)
      setUserId(data.user_id)
      setIsStudent(data.is_student || false)
      if (data.requires_2fa_setup) { setQrCode(data.qr_code); setStep('setup') }
      else setStep('verify')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid credentials')
    } finally { setLoading(false) }
  }

  const handleVerify = async (isSetup = false) => {
    if (code.length !== 6) return
    setLoading(true)
    try {
      const fn = isSetup ? authApi.verify2faSetup : authApi.verify2fa
      const { data } = await fn(userId, code, isStudent)
      setAuth(data.access_token, data.refresh_token, {
        id: data.user_id, full_name: data.full_name,
        email: data.email, role: data.role,
      })
      toast.success(`Welcome, ${data.full_name.split(' ')[0]}!`)
      navigate(ROLE_HOME[data.role] || '/')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid code')
      setCode('')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left — photo panel ── */}
      <div className="hidden lg:flex w-[55%] relative overflow-hidden">
        {/* Photo */}
        <img
          src={BG}
          alt="University campus"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Dark gradient overlay — bottom to top */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

        {/* Top-left logo */}
        <div className="absolute top-8 left-8 flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
          </div>
          <span className="text-white font-bold text-base tracking-tight">FaceAttend</span>
        </div>

        {/* Bottom text */}
        <div className="absolute bottom-10 left-8 right-8">
          <p className="text-white text-2xl font-bold leading-snug mb-2">
            Attendance, handled.
          </p>
          <p className="text-white/60 text-sm leading-relaxed max-w-xs">
            Secure, contactless attendance tracking for your institution.
          </p>
        </div>
      </div>

      {/* ── Right — form panel ── */}
      <div className="flex-1 flex flex-col bg-white">

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 px-6 pt-8 pb-4">
          <div className="w-7 h-7 bg-gray-900 rounded-lg flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
          </div>
          <span className="font-bold text-gray-900">FaceAttend</span>
        </div>

        <div className="flex-1 flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-sm animate-slide-up">

            {/* ── Credentials ── */}
            {step === 'credentials' && (
              <>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Sign in</h2>
                  <p className="text-gray-400 text-sm mt-1">Use your institutional email and password</p>
                </div>

                <form onSubmit={handleCredentials} className="space-y-4">
                  <Input
                    label="Email address"
                    type="email"
                    placeholder="you@university.ie"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    required
                    autoFocus
                  />

                  <div className="space-y-1.5">
                    <label className="label">Password</label>
                    <div className="relative">
                      <input
                        type={showPw ? 'text' : 'password'}
                        className="input pr-11"
                        placeholder="••••••••"
                        value={form.password}
                        onChange={e => setForm({ ...form, password: e.target.value })}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(!showPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition"
                      >
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" loading={loading} className="w-full btn-lg !mt-6">
                    Continue →
                  </Button>
                </form>

                <p className="text-center text-xs text-gray-300 mt-8">
                  Contact your system administrator if you cannot access your account.
                </p>
              </>
            )}

            {/* ── 2FA Setup ── */}
            {step === 'setup' && (
              <>
                <div className="mb-6">
                  <div className="w-10 h-10 bg-gray-900 rounded-2xl flex items-center justify-center mb-4">
                    <Shield size={18} className="text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                    Secure your account
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">
                    This is a one-time setup. Scan the QR code with an authenticator app.
                  </p>
                </div>

                {/* QR code */}
                <div className="flex justify-center mb-5">
                  <div className="p-3 bg-white border border-gray-200 rounded-2xl shadow-sm">
                    <img
                      src={`data:image/png;base64,${qrCode}`}
                      alt="2FA QR Code"
                      className="w-44 h-44"
                    />
                  </div>
                </div>

                <ol className="text-xs text-gray-500 space-y-1.5 mb-5 bg-gray-50 rounded-xl p-4">
                  <li>1. Open <span className="font-semibold text-gray-700">Google Authenticator</span> or <span className="font-semibold text-gray-700">Authy</span></li>
                  <li>2. Tap <span className="font-semibold text-gray-700">+</span> and scan the QR code above</li>
                  <li>3. Enter the 6-digit code to confirm</li>
                </ol>

                <div className="space-y-3">
                  <Input
                    label="6-digit code"
                    type="text"
                    inputMode="numeric"
                    placeholder="000000"
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="text-center text-xl tracking-[0.4em] font-mono"
                    autoFocus
                  />
                  <Button
                    onClick={() => handleVerify(true)}
                    loading={loading}
                    disabled={code.length !== 6}
                    className="w-full btn-lg"
                  >
                    Verify & Sign In
                  </Button>
                </div>
              </>
            )}

            {/* ── 2FA Verify ── */}
            {step === 'verify' && (
              <>
                <div className="mb-6">
                  <div className="w-10 h-10 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                    <Smartphone size={18} className="text-gray-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                    Two-step verification
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">
                    Enter the code from your authenticator app to continue.
                  </p>
                </div>

                <div className="space-y-3">
                  <Input
                    label="Authenticator code"
                    type="text"
                    inputMode="numeric"
                    placeholder="000000"
                    autoFocus
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="text-center text-xl tracking-[0.4em] font-mono"
                  />
                  <Button
                    onClick={() => handleVerify(false)}
                    loading={loading}
                    disabled={code.length !== 6}
                    className="w-full btn-lg"
                  >
                    Sign In
                  </Button>
                  <button
                    onClick={() => { setStep('credentials'); setCode('') }}
                    className="w-full text-sm text-gray-400 hover:text-gray-600 transition py-2"
                  >
                    ← Back
                  </button>
                </div>
              </>
            )}

          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-6 text-center">
          <p className="text-xs text-gray-200">
            © {new Date().getFullYear()} University of Technological Ireland · FaceAttend v1.0
          </p>
        </div>
      </div>
    </div>
  )
}