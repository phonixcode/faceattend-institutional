import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import Webcam from 'react-webcam'
import * as faceapi from 'face-api.js'
import { GraduationCap, Scan, CheckCircle, XCircle, AlertCircle, Wifi, WifiOff } from 'lucide-react'
import { kioskApi } from '../../services/api'
import { Spinner } from '../../components/ui'

// Kiosk mode — fullscreen, no auth, no sidebar
// Runs on a dedicated screen in the classroom

const POLL_INTERVAL  = 4000
const CHECKIN_COOLDOWN = 8000  // ms between auto-scans

const GRADE_LABEL = {
  FULL        : { label: 'Full Attendance',  color: '#10b981', bg: '#ecfdf5' },
  PARTIAL     : { label: 'Partial',          color: '#3b82f6', bg: '#eff6ff' },
  LEFT_EARLY  : { label: 'Left Early',       color: '#f59e0b', bg: '#fffbeb' },
  ARRIVED_LATE: { label: 'Arrived Late',     color: '#f59e0b', bg: '#fffbeb' },
  ABSENT      : { label: 'Absent',           color: '#6b7280', bg: '#f9fafb' },
}

export default function Kiosk() {
  const { lectureId }  = useParams()
  const webcamRef      = useRef(null)
  const canvasRef      = useRef(null)
  const lastScanRef    = useRef(0)
  const detectionRef   = useRef(null)
  const scanningRef    = useRef(false)

  const [status, setStatus]       = useState(null)   // lecture status
  const [activeScan, setActiveScan] = useState(null)
  const [attendance, setAttendance] = useState([])
  const [recentCheckins, setRecentCheckins] = useState([])
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [facesLive, setFacesLive] = useState(0)
  const [online, setOnline]       = useState(navigator.onLine)
  const [lastActivity, setLastActivity] = useState('Waiting for scan to open...')

  // Online/offline monitoring
  useEffect(() => {
    const on  = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  // Load face-api models
  useEffect(() => {
    const load = async () => {
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL)
      setModelsLoaded(true)
    }
    load().catch(console.error)
  }, [])

  // Poll lecture status
  useEffect(() => {
    const poll = async () => {
      try {
        const { data } = await kioskApi.lectureStatus(lectureId)
        setStatus(data)
        const scan = data.active_scan
        setActiveScan(scan)
        if (scan) {
          const { data: att } = await kioskApi.scanAttendance(scan.id)
          setAttendance(att.records || [])
        } else {
          setAttendance([])
        }
      } catch (err) {
        console.error('Poll error:', err)
      }
    }
    poll()
    const interval = setInterval(poll, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [lectureId])

  // Continuous face detection + auto-checkin
  useEffect(() => {
    if (!modelsLoaded) return

    const detect = async () => {
      if (!webcamRef.current?.video || !canvasRef.current) return
      const video  = webcamRef.current.video
      if (video.readyState !== 4) return

      const canvas = canvasRef.current
      canvas.width  = video.videoWidth
      canvas.height = video.videoHeight
      const ctx     = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const detections = await faceapi.detectAllFaces(
        video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.45 })
      )

      setFacesLive(detections.length)

      // Draw face boxes
      detections.forEach(d => {
        const { x, y, width, height } = d.box
        ctx.strokeStyle = '#10b981'
        ctx.lineWidth   = 3
        ctx.strokeRect(x, y, width, height)
        ctx.fillStyle   = 'rgba(16,185,129,0.08)'
        ctx.fillRect(x, y, width, height)
      })

      // Auto-checkin if scan is open and cooldown passed
      const now = Date.now()
      if (
        activeScan &&
        detections.length > 0 &&
        !scanningRef.current &&
        (now - lastScanRef.current) > CHECKIN_COOLDOWN
      ) {
        runCheckin(detections, video)
      }
    }

    detectionRef.current = setInterval(detect, 600)
    return () => clearInterval(detectionRef.current)
  }, [modelsLoaded, activeScan])

  const runCheckin = useCallback(async (detections, video) => {
    if (scanningRef.current || !activeScan) return
    scanningRef.current = true
    lastScanRef.current = Date.now()
    setLastActivity('Scanning...')

    try {
      const tempCanvas = document.createElement('canvas')
      const ctx        = tempCanvas.getContext('2d')
      const formData   = new FormData()

      for (const det of detections) {
        const { x, y, width, height } = det.box
        const pad = 40
        tempCanvas.width  = width  + pad * 2
        tempCanvas.height = height + pad * 2
        ctx.drawImage(video, x - pad, y - pad, width + pad * 2, height + pad * 2,
          0, 0, tempCanvas.width, tempCanvas.height)
        const blob = await new Promise(res => tempCanvas.toBlob(res, 'image/jpeg', 0.92))
        formData.append('images', blob, `face_${Date.now()}.jpg`)
      }

      const { data } = await kioskApi.checkin(activeScan.id, formData)
      const matched  = data.results.filter(r => r.status === 'MATCH')

      if (matched.length > 0) {
        setRecentCheckins(prev => [
          ...matched.map(r => ({
            ...r,
            at: new Date().toLocaleTimeString('en-IE', { hour:'2-digit', minute:'2-digit' }),
            key: `${r.student_id}-${Date.now()}`,
          })),
          ...prev,
        ].slice(0, 8))
        setLastActivity(`${matched.length} student${matched.length > 1 ? 's' : ''} recognised — ${new Date().toLocaleTimeString('en-IE')}`)
      } else {
        setLastActivity(`Faces detected but not recognised — ${new Date().toLocaleTimeString('en-IE')}`)
      }

      // Refresh attendance
      const { data: att } = await kioskApi.scanAttendance(activeScan.id)
      setAttendance(att.records || [])

    } catch (err) {
      console.error('Checkin error:', err)
      setLastActivity('Scan error — retrying...')
    } finally {
      scanningRef.current = false
    }
  }, [activeScan])

  const scanLabel = status?.active_scan?.scan_number
    ? `Scan ${status.active_scan.scan_number} — ${['Start of Class','Middle of Class','End of Class'][status.active_scan.scan_number - 1]}`
    : null

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}>

      {/* Header bar */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center">
            <GraduationCap size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold">FaceAttend</p>
            <p className="text-xs text-gray-500">
              {status?.lecture?.date} · {status?.lecture?.start_time?.slice(0,5)}–{status?.lecture?.end_time?.slice(0,5)} · {status?.lecture?.room}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Scan status pill */}
          {activeScan ? (
            <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 rounded-full px-4 py-1.5">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-emerald-300">{scanLabel}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5">
              <div className="w-2 h-2 bg-gray-600 rounded-full" />
              <span className="text-xs font-semibold text-gray-500">No Active Scan</span>
            </div>
          )}

          {/* Network indicator */}
          <div className={`flex items-center gap-1.5 text-xs font-medium ${online ? 'text-emerald-400' : 'text-red-400'}`}>
            {online ? <Wifi size={13} /> : <WifiOff size={13} />}
            {online ? 'Connected' : 'Offline'}
          </div>

          {/* Clock */}
          <Clock />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">

        {/* Camera feed — left side */}
        <div className="flex-1 relative bg-black">
          <Webcam
            ref={webcamRef}
            videoConstraints={{ width: 1280, height: 720, facingMode: 'environment' }}
            className="w-full h-full object-cover"
            mirrored={false}
          />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

          {/* Loading overlay */}
          {!modelsLoaded && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3">
              <Spinner size={28} className="text-white" />
              <p className="text-sm text-gray-400">Loading face detection...</p>
            </div>
          )}

          {/* Scan state overlay — when no scan open */}
          {modelsLoaded && !activeScan && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
              <div className="text-center">
                <Scan size={40} className="text-gray-500 mx-auto mb-3" />
                <p className="text-lg font-bold text-gray-400">Waiting for Scan</p>
                <p className="text-sm text-gray-600 mt-1">Your lecturer will open a scan window</p>
              </div>
            </div>
          )}

          {/* Face count */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded-full px-4 py-2">
            <div className={`w-2 h-2 rounded-full ${facesLive > 0 && activeScan ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
            <span className="text-xs font-semibold text-white">
              {facesLive} face{facesLive !== 1 ? 's' : ''} in frame
            </span>
          </div>

          {/* Last activity */}
          <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm rounded-xl px-3 py-2">
            <p className="text-xs text-gray-400">{lastActivity}</p>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-80 flex-shrink-0 bg-gray-900 border-l border-white/10 flex flex-col">

          {/* Scan progress */}
          <div className="px-5 py-4 border-b border-white/10">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Scan Progress</p>
            <div className="space-y-2">
              {[1, 2, 3].map(n => {
                const scan = status?.all_scans?.find(s => s.scan_number === n)
                const isOpen   = scan?.status === 'OPEN'
                const isClosed = scan?.status === 'CLOSED'
                return (
                  <div key={n} className={`flex items-center justify-between rounded-xl px-3 py-2 ${
                    isOpen ? 'bg-emerald-500/20 border border-emerald-500/30' :
                    isClosed ? 'bg-white/5 border border-white/5' :
                    'bg-white/5 border border-white/5 opacity-40'
                  }`}>
                    <div className="flex items-center gap-2">
                      {isClosed
                        ? <CheckCircle size={14} className="text-emerald-500" />
                        : isOpen
                          ? <div className="w-3.5 h-3.5 rounded-full border-2 border-emerald-400 animate-pulse" />
                          : <div className="w-3.5 h-3.5 rounded-full border-2 border-white/20" />
                      }
                      <span className={`text-xs font-semibold ${isOpen ? 'text-emerald-300' : isClosed ? 'text-gray-400' : 'text-gray-600'}`}>
                        Scan {n}
                      </span>
                    </div>
                    <span className={`text-xs font-medium ${isOpen ? 'text-emerald-400' : isClosed ? 'text-gray-500' : 'text-gray-700'}`}>
                      {isClosed ? 'Done' : isOpen ? 'Active' : 'Waiting'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Checked-in count */}
          <div className="px-5 py-4 border-b border-white/10">
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Checked In</p>
              <p className="text-2xl font-bold text-white">{attendance.length}</p>
            </div>
          </div>

          {/* Recent recognitions */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Recent</p>
            {recentCheckins.length === 0 ? (
              <p className="text-xs text-gray-700 text-center py-6">Recognitions will appear here</p>
            ) : (
              <div className="space-y-2">
                {recentCheckins.map((c) => (
                  <div
                    key={c.key}
                    className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2.5 animate-slide-up"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle size={13} className="text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">{c.full_name}</p>
                        <p className="text-xs text-gray-500">{c.at}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold ${
                      c.confidence >= 70 ? 'text-emerald-400' :
                      c.confidence >= 40 ? 'text-amber-400'   : 'text-red-400'
                    }`}>
                      {c.confidence?.toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer instruction */}
          <div className="px-5 py-4 border-t border-white/10 text-center">
            {activeScan ? (
              <p className="text-xs text-gray-500">
                Look directly at the camera to check in automatically
              </p>
            ) : (
              <p className="text-xs text-gray-600">
                Please wait — your lecturer will open the scan
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Live clock component
function Clock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="text-right">
      <p className="text-sm font-bold text-white tabular-nums">
        {time.toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </p>
      <p className="text-xs text-gray-600">
        {time.toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short' })}
      </p>
    </div>
  )
}