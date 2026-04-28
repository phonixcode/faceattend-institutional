import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Webcam from 'react-webcam'
import * as faceapi from 'face-api.js'
import { Scan, Users, Camera, CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react'
import { kioskApi } from '../../services/api'
import { Page, Card, Button, Badge, Spinner } from '../../components/ui'
import toast from 'react-hot-toast'

const SCAN_LABELS = { 1: 'Start of Class', 2: 'Middle of Class', 3: 'End of Class' }

export default function LectureLive() {
  const { lectureId } = useParams()
  const navigate      = useNavigate()
  const webcamRef     = useRef(null)
  const canvasRef     = useRef(null)
  const detectionRef  = useRef(null)

  const [status, setStatus]       = useState(null)  // lecture status from backend
  const [activeScan, setActiveScan] = useState(null)
  const [attendance, setAttendance] = useState([])
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [facesDetected, setFacesDetected] = useState(0)
  const [scanning, setScanning]   = useState(false)
  const [openingN, setOpeningN]   = useState(null)
  const [loading, setLoading]     = useState(true)
  const [cameras, setCameras]     = useState([])
  const [selectedCamera, setSelectedCamera] = useState('')

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      ])
      setModelsLoaded(true)
    }
    loadModels().catch(console.error)
  }, [])

  // Enumerate cameras
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      const cams = devices.filter(d => d.kind === 'videoinput')
      setCameras(cams)
      if (cams.length > 0) setSelectedCamera(cams[0].deviceId)
    })
  }, [])

  // Poll lecture status every 5s
  useEffect(() => {
    const poll = () => {
      kioskApi.lectureStatus(lectureId)
        .then(r => {
          setStatus(r.data)
          setActiveScan(r.data.active_scan)
          if (r.data.active_scan) {
            loadAttendance(r.data.active_scan.id)
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false))
    }
    poll()
    const interval = setInterval(poll, 5000)
    return () => clearInterval(interval)
  }, [lectureId])

  const loadAttendance = (scanId) => {
    kioskApi.scanAttendance(scanId)
      .then(r => setAttendance(r.data.records || []))
      .catch(console.error)
  }

  // Continuous face detection on video
  useEffect(() => {
    if (!modelsLoaded) return
    const detect = async () => {
      if (!webcamRef.current?.video || !canvasRef.current) return
      const video  = webcamRef.current.video
      const canvas = canvasRef.current
      if (video.readyState !== 4) return

      canvas.width  = video.videoWidth
      canvas.height = video.videoHeight
      const ctx     = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const detections = await faceapi.detectAllFaces(
        video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 })
      )
      setFacesDetected(detections.length)

      // Draw bounding boxes
      detections.forEach(d => {
        const { x, y, width, height } = d.box
        ctx.strokeStyle = '#10b981'
        ctx.lineWidth   = 2
        ctx.strokeRect(x, y, width, height)
        ctx.fillStyle   = 'rgba(16,185,129,0.1)'
        ctx.fillRect(x, y, width, height)
      })
    }

    detectionRef.current = setInterval(detect, 500)
    return () => clearInterval(detectionRef.current)
  }, [modelsLoaded])

  const openScan = async (scanNumber) => {
    setOpeningN(scanNumber)
    try {
      const fd = new FormData()
      fd.append('lecture_id',  lectureId)
      fd.append('scan_number', scanNumber)
      await kioskApi.openScan(fd)
      toast.success(`Scan ${scanNumber} opened`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to open scan')
    } finally {
      setOpeningN(null)
    }
  }

  const closeScan = async () => {
    if (!activeScan) return
    if (!confirm(`Close Scan ${activeScan.scan_number}? Students cannot check in after this.`)) return
    try {
      await kioskApi.closeScan(activeScan.id)
      toast.success('Scan closed')
      setActiveScan(null)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    }
  }

  const runCheckin = useCallback(async () => {
    if (!activeScan || !webcamRef.current?.video || scanning) return
    setScanning(true)

    try {
      const video    = webcamRef.current.video
      const detections = await faceapi.detectAllFaces(
        video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 })
      )

      if (detections.length === 0) {
        toast.error('No faces detected — make sure students are visible')
        return
      }

      // Crop each face and send to backend
      const canvas  = document.createElement('canvas')
      const ctx     = canvas.getContext('2d')
      const formData= new FormData()

      for (const det of detections) {
        const { x, y, width, height } = det.box
        const pad = 30
        canvas.width  = width  + pad * 2
        canvas.height = height + pad * 2
        ctx.drawImage(video, x - pad, y - pad, width + pad*2, height + pad*2, 0, 0, canvas.width, canvas.height)

        const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.9))
        formData.append('images', blob, `face_${Date.now()}.jpg`)
      }

      const { data } = await kioskApi.checkin(activeScan.id, formData)

      const matched = data.results.filter(r => r.status === 'MATCH').length
      toast.success(`${data.faces_detected} faces detected · ${matched} recognised`)
      loadAttendance(activeScan.id)

    } catch (err) {
      toast.error(err.response?.data?.detail || 'Scan failed')
    } finally {
      setScanning(false)
    }
  }, [activeScan, scanning])

  const allScans    = status?.all_scans || []
  const completedNs = allScans.filter(s => s.status === 'CLOSED').map(s => s.scan_number)

  if (loading) return <div className="flex justify-center py-20"><Spinner size={24} className="text-gray-300" /></div>

  return (
    <Page
      title="Live Lecture"
      subtitle={`${status?.lecture?.date} · ${status?.lecture?.start_time?.slice(0,5)}–${status?.lecture?.end_time?.slice(0,5)} · ${status?.lecture?.room}`}
      actions={
        <Button variant="secondary" onClick={() => navigate(-1)}>
          <X size={14} /> Exit
        </Button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Camera panel */}
        <div className="lg:col-span-2 space-y-4">

          {/* Camera selector */}
          {cameras.length > 1 && (
            <div className="flex items-center gap-3">
              <Camera size={15} className="text-gray-400" />
              <select
                className="input py-2 text-sm flex-1 max-w-xs"
                value={selectedCamera}
                onChange={e => setSelectedCamera(e.target.value)}
              >
                {cameras.map(c => (
                  <option key={c.deviceId} value={c.deviceId}>{c.label || `Camera ${c.deviceId.slice(0,8)}`}</option>
                ))}
              </select>
            </div>
          )}

          {/* Camera feed */}
          <Card padding={false} className="overflow-hidden relative">
            <Webcam
              ref={webcamRef}
              videoConstraints={{ deviceId: selectedCamera, width: 1280, height: 720 }}
              className="w-full"
              screenshotFormat="image/jpeg"
            />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

            {/* Face count overlay */}
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${facesDetected > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
              {facesDetected} face{facesDetected !== 1 ? 's' : ''} detected
            </div>

            {!modelsLoaded && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <div className="text-center text-white">
                  <Spinner size={24} className="mx-auto mb-2" />
                  <p className="text-sm">Loading face detection models...</p>
                </div>
              </div>
            )}
          </Card>

          {/* Scan action */}
          {activeScan ? (
            <div className="flex gap-3">
              <Button
                className="flex-1 btn-lg"
                variant="success"
                onClick={runCheckin}
                loading={scanning}
                disabled={!modelsLoaded || facesDetected === 0}
              >
                <Scan size={18} />
                {scanning ? 'Scanning...' : `Capture Scan ${activeScan.scan_number}`}
              </Button>
              <Button variant="danger" onClick={closeScan}>
                Close Scan
              </Button>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-center">
              <p className="text-sm text-gray-500">No scan window is currently open</p>
              <p className="text-xs text-gray-400 mt-1">Open a scan window from the panel on the right</p>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="space-y-4">

          {/* Scan windows */}
          <Card>
            <h3 className="text-sm font-bold text-gray-700 mb-4">Scan Windows</h3>
            <div className="space-y-2">
              {[1, 2, 3].map((n) => {
                const scan      = allScans.find(s => s.scan_number === n)
                const isOpen    = scan?.status === 'OPEN'
                const isClosed  = scan?.status === 'CLOSED'
                const scheduledScan = status?.lecture && (() => {
                  const l = status.lecture
                  const openKey  = `scan${n}_opens_at`
                  const closeKey = `scan${n}_closes_at`
                  return null
                })()

                return (
                  <div
                    key={n}
                    className={`flex items-center justify-between rounded-xl p-3 transition ${
                      isOpen ? 'bg-emerald-50 border border-emerald-200' :
                      isClosed ? 'bg-gray-50 border border-gray-100' :
                      'bg-white border border-gray-100'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Scan {n}</p>
                      <p className="text-xs text-gray-400">{SCAN_LABELS[n]}</p>
                    </div>
                    {isClosed ? (
                      <Badge variant="gray">Closed</Badge>
                    ) : isOpen ? (
                      <Badge variant="green">Open</Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => openScan(n)}
                        loading={openingN === n}
                        disabled={!!activeScan || completedNs.includes(n)}
                      >
                        Open
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Live attendance */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-700">Checked In</h3>
              <Badge variant="green">{attendance.length}</Badge>
            </div>

            {attendance.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No check-ins yet</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {attendance.map((a) => (
                  <div key={a.student_id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{a.full_name}</p>
                      <p className="text-xs text-gray-400">{a.student_number}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-bold ${
                        a.confidence >= 70 ? 'text-emerald-600' :
                        a.confidence >= 40 ? 'text-amber-600'   : 'text-red-600'
                      }`}>
                        {a.confidence.toFixed(0)}%
                      </p>
                      {a.needs_review && <span className="text-xs text-amber-500">⚠ Review</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </Page>
  )
}