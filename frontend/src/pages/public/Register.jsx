import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import Webcam from 'react-webcam'
import { GraduationCap, Camera, CheckCircle, RefreshCw, Send, Info } from 'lucide-react'
import { publicApi } from '../../services/api'
import { Button, Input, Card, Spinner } from '../../components/ui'
import toast from 'react-hot-toast'

const CAPTURE_COUNT = 5
const INSTRUCTIONS  = [
  'Look straight at the camera',
  'Turn slightly left',
  'Turn slightly right',
  'Tilt slightly up',
  'Tilt slightly down',
]

export default function PublicRegister() {
  const { moduleId }  = useParams()
  const webcamRef     = useRef(null)

  const [module, setModule]     = useState(null)
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [step, setStep]         = useState('form')  // form | camera | done
  const [captures, setCaptures] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    student_number: '', full_name: '', email: ''
  })

  useEffect(() => {
    publicApi.moduleInfo(moduleId)
      .then(r => setModule(r.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [moduleId])

  const capture = useCallback(() => {
    if (!webcamRef.current) return
    const img = webcamRef.current.getScreenshot()
    if (!img) return
    setCaptures(prev => [...prev.slice(-CAPTURE_COUNT + 1), img])
  }, [])

  const handleSubmit = async () => {
    if (captures.length < CAPTURE_COUNT) {
      toast.error(`Please capture ${CAPTURE_COUNT} photos`)
      return
    }
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('module_id',      moduleId)
      formData.append('student_number', form.student_number)
      formData.append('full_name',      form.full_name)
      formData.append('email',          form.email)

      captures.forEach((b64, i) => {
        const byteStr = atob(b64.split(',')[1])
        const arr     = new Uint8Array(byteStr.length)
        for (let j = 0; j < byteStr.length; j++) arr[j] = byteStr.charCodeAt(j)
        const blob    = new Blob([arr], { type: 'image/jpeg' })
        formData.append('images', blob, `face_${i}.jpg`)
      })

      await publicApi.register(formData)
      setStep('done')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Spinner size={24} className="text-gray-400" />
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="text-center">
        <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <GraduationCap size={20} className="text-red-400" />
        </div>
        <h1 className="text-lg font-bold text-gray-900">Module not found</h1>
        <p className="text-sm text-gray-500 mt-1">This registration link may have expired or is invalid.</p>
      </div>
    </div>
  )

  const currentStep = captures.length

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <GraduationCap size={20} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Module Registration</h1>
          <p className="text-sm text-gray-500 mt-1">
            {module?.module_code} — {module?.module_name}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Lecturer: {module?.lecturer_name}</p>
        </div>

        {/* Done state */}
        {step === 'done' && (
          <Card className="text-center py-12">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={28} className="text-emerald-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Registration Submitted!</h2>
            <p className="text-sm text-gray-500 max-w-xs mx-auto">
              Your registration is pending review by your lecturer. You'll be notified once approved.
            </p>
          </Card>
        )}

        {/* Form step */}
        {step === 'form' && (
          <Card>
            <h2 className="text-base font-bold text-gray-900 mb-5">Your Details</h2>
            <div className="space-y-4">
              <Input
                label="Student Number"
                value={form.student_number}
                onChange={e => setForm({ ...form, student_number: e.target.value })}
                placeholder="e.g. STU2024001"
                required
              />
              <Input
                label="Full Name"
                value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })}
                placeholder="John Adeyemi"
                required
              />
              <Input
                label="University Email"
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="john@student.ie"
                required
              />
              <Button
                className="w-full btn-lg mt-2"
                onClick={() => {
                  if (!form.student_number || !form.full_name || !form.email) {
                    toast.error('Please fill in all fields')
                    return
                  }
                  setStep('camera')
                }}
              >
                Continue to Face Capture →
              </Button>
            </div>
          </Card>
        )}

        {/* Camera step */}
        {step === 'camera' && (
          <div className="space-y-4">

            {/* Progress */}
            <div className="flex items-center gap-2">
              {Array.from({ length: CAPTURE_COUNT }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                    i < currentStep ? 'bg-emerald-500' : 'bg-gray-200'
                  }`}
                />
              ))}
              <span className="text-xs font-semibold text-gray-500 ml-1 flex-shrink-0">
                {currentStep}/{CAPTURE_COUNT}
              </span>
            </div>

            {/* Instruction */}
            {currentStep < CAPTURE_COUNT && (
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
                <Info size={15} className="text-blue-500 flex-shrink-0" />
                <p className="text-sm font-semibold text-blue-800">
                  Photo {currentStep + 1}: {INSTRUCTIONS[currentStep]}
                </p>
              </div>
            )}

            {/* Webcam */}
            <Card padding={false} className="overflow-hidden">
              <Webcam
                ref={webcamRef}
                videoConstraints={{ width: 720, height: 480, facingMode: 'user' }}
                screenshotFormat="image/jpeg"
                className="w-full"
                mirrored
              />
            </Card>

            {/* Thumbnails */}
            {captures.length > 0 && (
              <div className="flex gap-2">
                {captures.map((img, i) => (
                  <div key={i} className="relative flex-1">
                    <img src={img} alt="" className="w-full aspect-square object-cover rounded-xl border-2 border-emerald-300" />
                    <div className="absolute top-1 right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                      <CheckCircle size={11} className="text-white" />
                    </div>
                  </div>
                ))}
                {Array.from({ length: CAPTURE_COUNT - captures.length }).map((_, i) => (
                  <div key={`e${i}`} className="flex-1 aspect-square rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center">
                    <Camera size={12} className="text-gray-300" />
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              {captures.length > 0 && (
                <Button variant="secondary" className="flex-shrink-0" onClick={() => setCaptures([])}>
                  <RefreshCw size={13} />
                </Button>
              )}
              {currentStep < CAPTURE_COUNT ? (
                <Button className="flex-1 btn-lg" onClick={capture}>
                  <Camera size={16} />
                  {currentStep === 0 ? 'Start Capture' : `Photo ${currentStep + 1}`}
                </Button>
              ) : (
                <Button
                  className="flex-1 btn-lg"
                  variant="success"
                  onClick={handleSubmit}
                  loading={submitting}
                >
                  <Send size={16} />
                  {submitting ? 'Submitting...' : 'Submit Registration'}
                </Button>
              )}
            </div>

            <button
              onClick={() => { setStep('form'); setCaptures([]) }}
              className="w-full text-sm text-gray-400 hover:text-gray-600 transition py-2"
            >
              ← Back to details
            </button>
          </div>
        )}

      </div>
    </div>
  )
}