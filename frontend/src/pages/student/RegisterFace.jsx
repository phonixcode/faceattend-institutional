import { useRef, useState, useCallback, useEffect } from 'react'
import Webcam from 'react-webcam'
import { Camera, CheckCircle, RefreshCw, Upload, Info, ShieldCheck } from 'lucide-react'
import { studentApi, authApi } from '../../services/api'
import { Page, Card, Button, Spinner } from '../../components/ui'
import toast from 'react-hot-toast'

const CAPTURE_COUNT = 5
const INSTRUCTIONS  = [
  'Look straight at the camera',
  'Turn slightly left',
  'Turn slightly right',
  'Tilt head slightly up',
  'Tilt head slightly down',
]

export default function StudentRegisterFace() {
  const webcamRef               = useRef(null)
  const [captures, setCaptures] = useState([])
  const [uploading, setUploading] = useState(false)
  const [done, setDone]         = useState(false)
  const [cameras, setCameras]   = useState([])
  const [selectedCamera, setSelectedCamera] = useState('')
  const [alreadyRegistered, setAlreadyRegistered] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(true)

  // Check if face already registered
  useEffect(() => {
    authApi.meStudent()
      .then(r => {
        if (r.data?.face_registered) setAlreadyRegistered(true)
      })
      .catch(() => {})
      .finally(() => setCheckingStatus(false))
  }, [])

  // Enumerate cameras
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      const cams = devices.filter(d => d.kind === 'videoinput')
      setCameras(cams)
      if (cams.length > 0) setSelectedCamera(cams[0].deviceId)
    }).catch(() => {})
  }, [])

  const capture = useCallback(() => {
    if (!webcamRef.current) return
    const img = webcamRef.current.getScreenshot()
    if (!img) return
    setCaptures(prev => [...prev.slice(-CAPTURE_COUNT + 1), img])
    toast.success(`Photo ${Math.min(captures.length + 1, CAPTURE_COUNT)} of ${CAPTURE_COUNT} captured`)
  }, [captures.length])

  const reset = () => { setCaptures([]); setDone(false) }

  const startReRegister = () => {
    setAlreadyRegistered(false)
    setCaptures([])
    setDone(false)
  }

  const handleSubmit = async () => {
    if (captures.length < CAPTURE_COUNT) {
      toast.error(`Please capture ${CAPTURE_COUNT} photos`)
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      captures.forEach((b64, i) => {
        const byteStr = atob(b64.split(',')[1])
        const arr     = new Uint8Array(byteStr.length)
        for (let j = 0; j < byteStr.length; j++) arr[j] = byteStr.charCodeAt(j)
        formData.append('images', new Blob([arr], { type: 'image/jpeg' }), `face_${i}.jpg`)
      })
      await studentApi.registerFace(formData)
      toast.success('Face registered successfully!')
      setDone(true)
      setAlreadyRegistered(true)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    } finally {
      setUploading(false)
    }
  }

  if (checkingStatus) {
    return (
      <Page title="Face Registration">
        <div className="flex justify-center py-20">
          <Spinner size={20} className="text-gray-300" />
        </div>
      </Page>
    )
  }

  // Already registered — show confirmation screen
  if (alreadyRegistered && !done) {
    return (
      <Page title="Face Registration">
        <div className="max-w-md mx-auto">
          <Card className="text-center py-12">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={28} className="text-emerald-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Face Already Registered</h2>
            <p className="text-sm text-gray-500 mb-6">
              Your face is registered and ready for attendance scans.
              You don't need to do anything unless you want to update it.
            </p>
            <Button variant="secondary" onClick={startReRegister}>
              <RefreshCw size={14} /> Update Face Data
            </Button>
          </Card>
        </div>
      </Page>
    )
  }

  // Success screen after re-registration
  if (done) {
    return (
      <Page title="Face Registration">
        <div className="max-w-md mx-auto">
          <Card className="text-center py-12">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={28} className="text-emerald-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">You're all set!</h2>
            <p className="text-sm text-gray-500 mb-6">
              Your face has been registered. The system will now recognise you
              during attendance scans.
            </p>
            <Button variant="secondary" onClick={reset}>
              <RefreshCw size={14} /> Re-register
            </Button>
          </Card>
        </div>
      </Page>
    )
  }

  const step = captures.length

  return (
    <Page
      title="Register Your Face"
      subtitle="We need 5 photos of your face from different angles"
    >
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Progress */}
        <div className="flex items-center gap-2">
          {Array.from({ length: CAPTURE_COUNT }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                i < step ? 'bg-emerald-500' : 'bg-gray-200'
              }`}
            />
          ))}
          <span className="text-xs font-semibold text-gray-500 ml-2 flex-shrink-0">
            {step}/{CAPTURE_COUNT}
          </span>
        </div>

        {/* Instruction */}
        {step < CAPTURE_COUNT && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
            <Info size={16} className="text-blue-500 flex-shrink-0" />
            <p className="text-sm font-semibold text-blue-800">
              Photo {step + 1}: {INSTRUCTIONS[step]}
            </p>
          </div>
        )}

        {/* Camera */}
        <Card padding={false} className="overflow-hidden">
          {cameras.length > 1 && (
            <div className="p-3 border-b border-gray-100 flex items-center gap-3">
              <Camera size={14} className="text-gray-400" />
              <select
                className="input py-1.5 text-sm flex-1 max-w-xs"
                value={selectedCamera}
                onChange={e => setSelectedCamera(e.target.value)}
              >
                {cameras.map(c => (
                  <option key={c.deviceId} value={c.deviceId}>
                    {c.label || `Camera ${c.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>
          )}
          <Webcam
            ref={webcamRef}
            videoConstraints={{ deviceId: selectedCamera, width: 720, height: 480, facingMode: 'user' }}
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
                <img
                  src={img}
                  alt={`Capture ${i + 1}`}
                  className="w-full aspect-square object-cover rounded-xl border-2 border-emerald-300"
                />
                <div className="absolute top-1 right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                  <CheckCircle size={12} className="text-white" />
                </div>
              </div>
            ))}
            {Array.from({ length: CAPTURE_COUNT - captures.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex-1 aspect-square rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center"
              >
                <Camera size={14} className="text-gray-300" />
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {step > 0 && (
            <Button variant="secondary" onClick={reset} className="flex-shrink-0">
              <RefreshCw size={14} /> Reset
            </Button>
          )}
          {step < CAPTURE_COUNT ? (
            <Button className="flex-1 btn-lg" onClick={capture}>
              <Camera size={18} />
              {step === 0 ? 'Take First Photo' : `Take Photo ${step + 1}`}
            </Button>
          ) : (
            <Button className="flex-1 btn-lg" variant="success" onClick={handleSubmit} loading={uploading}>
              <Upload size={18} />
              {uploading ? 'Registering...' : 'Submit & Register Face'}
            </Button>
          )}
        </div>

        {/* Tips */}
        <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Tips for best results</p>
          {[
            'Ensure your face is well lit — avoid backlighting',
            'Remove glasses or hats if possible',
            'Keep your face clearly visible in the frame',
            'Use the same camera the kiosk will use for best accuracy',
          ].map((tip, i) => (
            <p key={i} className="text-xs text-gray-500 flex items-start gap-2">
              <span className="text-emerald-500 font-bold mt-0.5">✓</span> {tip}
            </p>
          ))}
        </div>

      </div>
    </Page>
  )
}
