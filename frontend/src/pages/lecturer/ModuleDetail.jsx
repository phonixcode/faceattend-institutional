import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Users, Calendar, BarChart3, Plus, Scan,
  Upload, UserPlus, Link, ChevronRight, Trash2
} from 'lucide-react'
import { lecturerApi } from '../../services/api'
import { Page, Card, Button, Input, Select, Modal, Badge, Table, Empty, Spinner } from '../../components/ui'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const TABS = ['Students', 'Lectures', 'Reports']

export default function LecturerModuleDetail() {
  const { id }      = useParams()
  const navigate    = useNavigate()
  const [tab, setTab]       = useState('Students')
  const [module, setModule] = useState(null)
  const [students, setStudents] = useState([])
  const [lectures, setLectures] = useState([])
  const [loading, setLoading]   = useState(true)

  // Modals
  const [addStudent, setAddStudent] = useState(false)
  const [addLecture, setAddLecture] = useState(false)
  const [saving, setSaving]         = useState(false)

  const [studentForm, setStudentForm] = useState({
    student_number:'', full_name:'', email:'', password:''
  })
  const [lectureForm, setLectureForm] = useState({
    date:'', start_time:'09:00', end_time:'11:00', room:'', is_recurring: false
  })

  const load = async () => {
    setLoading(true)
    try {
      const [m, s, l] = await Promise.all([
        lecturerApi.module(id),
        lecturerApi.students(id, { page: 1, page_size: 500 }),
        lecturerApi.lectures(id),
      ])
      setModule(m.data)
      setStudents(s.data?.items ?? [])
      setLectures(Array.isArray(l.data) ? l.data : [])
    } catch { toast.error('Failed to load module') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  const handleAddStudent = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const { data: s } = await lecturerApi.createStudent({
        ...studentForm, programme_id: module?.programme_id
      })
      await lecturerApi.enrol(id, { student_ids: [s.id] })
      toast.success('Student added and enrolled')
      setAddStudent(false)
      setStudentForm({ student_number:'', full_name:'', email:'', password:'' })
      load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    finally { setSaving(false) }
  }

  const handleAddLecture = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await lecturerApi.createLecture(id, { module_id: id, ...lectureForm })
      toast.success('Lecture scheduled')
      setAddLecture(false)
      setLectureForm({ date:'', start_time:'09:00', end_time:'11:00', room:'', is_recurring:false })
      load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    finally { setSaving(false) }
  }

  const handleCancelLecture = async (lectureId) => {
    if (!confirm('Cancel this lecture?')) return
    try {
      await lecturerApi.cancelLecture(id, lectureId)
      toast.success('Lecture cancelled')
      load()
    } catch { toast.error('Failed to cancel') }
  }

  const copyRegLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/public/register/${id}`)
    toast.success('Registration link copied!')
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size={24} className="text-gray-300" /></div>

  const studentCols = [
    { key: 'full_name', label: 'Student',
      render: (v, row) => (
        <div>
          <p className="font-semibold text-sm text-gray-800">{v}</p>
          <p className="text-xs text-gray-400">{row.student_number}</p>
        </div>
      )
    },
    { key: 'email', label: 'Email', render: (v) => <span className="text-xs text-gray-500">{v}</span> },
    { key: 'face_registered', label: 'Face',
      render: (v) => v ? <Badge variant="green">Registered</Badge> : <Badge variant="amber">Pending</Badge>
    },
  ]

  const lectureCols = [
    { key: 'date',       label: 'Date',
      render: (v) => format(new Date(v), 'EEE dd MMM yyyy') },
    { key: 'start_time', label: 'Time',
      render: (v, row) => `${v?.slice(0,5)} – ${row.end_time?.slice(0,5)}` },
    { key: 'room',       label: 'Room' },
    { key: 'id', label: '',
      render: (v, row) => (
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => navigate(`/lecturer/lecture/${v}/live`)}>
            <Scan size={13} /> Live
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleCancelLecture(v)}>
            <Trash2 size={13} />
          </Button>
        </div>
      )
    },
  ]

  return (
    <Page
      title={module?.module_name}
      subtitle={`${module?.module_code} · Semester ${module?.semester}`}
      actions={
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={copyRegLink}>
            <Link size={13} /> Share Registration Link
          </Button>
          <Button size="sm" onClick={() => navigate(`/lecturer/reports?module=${id}`)}>
            <BarChart3 size={13} /> Reports
          </Button>
        </div>
      }
    >
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
              tab === t ? 'bg-white text-gray-900 shadow-card' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Students tab */}
      {tab === 'Students' && (
        <Card padding={false}>
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <p className="text-sm font-bold text-gray-700">{students.length} students enrolled</p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={copyRegLink}>
                <Link size={13} /> Self-Register Link
              </Button>
              <Button size="sm" onClick={() => setAddStudent(true)}>
                <UserPlus size={13} /> Add Student
              </Button>
            </div>
          </div>
          {students.length === 0
            ? <Empty icon={<Users size={20} />} title="No students enrolled yet" />
            : <Table columns={studentCols} data={students} />
          }
        </Card>
      )}

      {/* Lectures tab */}
      {tab === 'Lectures' && (
        <Card padding={false}>
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <p className="text-sm font-bold text-gray-700">{lectures.length} lectures scheduled</p>
            <Button size="sm" onClick={() => setAddLecture(true)}>
              <Plus size={13} /> Schedule Lecture
            </Button>
          </div>
          {lectures.length === 0
            ? <Empty icon={<Calendar size={20} />} title="No lectures scheduled yet"
                action={<Button size="sm" onClick={() => setAddLecture(true)}><Plus size={13}/>Schedule</Button>}
              />
            : <Table columns={lectureCols} data={lectures} />
          }
        </Card>
      )}

      {/* Reports tab */}
      {tab === 'Reports' && (
        <div>
          <p className="text-sm text-gray-500 mb-4">Full attendance breakdown for this module.</p>
          <ModuleReport moduleId={id} />
        </div>
      )}

      {/* Add Student Modal */}
      <Modal open={addStudent} onClose={() => setAddStudent(false)} title="Add Student">
        <form onSubmit={handleAddStudent} className="space-y-4">
          <Input label="Student Number" value={studentForm.student_number} onChange={e => setStudentForm({...studentForm, student_number: e.target.value})} placeholder="STU2024001" required />
          <Input label="Full Name"      value={studentForm.full_name}      onChange={e => setStudentForm({...studentForm, full_name: e.target.value})} placeholder="John Adeyemi" required />
          <Input label="Email" type="email" value={studentForm.email} onChange={e => setStudentForm({...studentForm, email: e.target.value})} placeholder="john@student.ie" required />
          <Input label="Temp Password" type="password" value={studentForm.password} onChange={e => setStudentForm({...studentForm, password: e.target.value})} placeholder="Student can change later" required />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setAddStudent(false)}>Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">Add & Enrol</Button>
          </div>
        </form>
      </Modal>

      {/* Schedule Lecture Modal */}
      <Modal open={addLecture} onClose={() => setAddLecture(false)} title="Schedule Lecture">
        <form onSubmit={handleAddLecture} className="space-y-4">
          <Input label="Date" type="date" value={lectureForm.date} onChange={e => setLectureForm({...lectureForm, date: e.target.value})} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Time" type="time" value={lectureForm.start_time} onChange={e => setLectureForm({...lectureForm, start_time: e.target.value})} required />
            <Input label="End Time"   type="time" value={lectureForm.end_time}   onChange={e => setLectureForm({...lectureForm, end_time: e.target.value})}   required />
          </div>
          <Input label="Room" value={lectureForm.room} onChange={e => setLectureForm({...lectureForm, room: e.target.value})} placeholder="Room A101 or Online" required />
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={lectureForm.is_recurring} onChange={e => setLectureForm({...lectureForm, is_recurring: e.target.checked})} className="rounded" />
            Recurring weekly lecture
          </label>
          <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
            Scan windows are auto-calculated from your lecture duration.
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setAddLecture(false)}>Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">Schedule</Button>
          </div>
        </form>
      </Modal>
    </Page>
  )
}

// ── Inline report component ───────────────────────────────────────────────
function ModuleReport({ moduleId }) {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    lecturerApi.report(moduleId)
      .then(r => setReport(r.data))
      .catch(() => toast.error('Failed to load report'))
      .finally(() => setLoading(false))
  }, [moduleId])

  const handleExport = async () => {
    try {
      const res  = await lecturerApi.exportReport(moduleId)
      const url  = URL.createObjectURL(new Blob([res.data]))
      const a    = document.createElement('a')
      a.href     = url
      a.download = `${report?.module_code}_report.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Report downloaded')
    } catch { toast.error('Export failed') }
  }

  if (loading) return <div className="flex justify-center py-10"><Spinner size={20} className="text-gray-300" /></div>
  if (!report) return null

  const gradeColor = (pct) => pct >= 80 ? 'green' : pct >= 60 ? 'amber' : 'red'

  return (
    <Card padding={false}>
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div>
          <p className="text-sm font-bold text-gray-700">{report.total_students} students · {report.total_lectures} lectures</p>
          <p className="text-xs text-gray-400 mt-0.5">{report.at_risk_count} students at risk (&lt;80%)</p>
        </div>
        <Button size="sm" variant="secondary" onClick={handleExport}>Export CSV</Button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Student</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Attendance</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">FULL</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">PARTIAL</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">ABSENT</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {report.students.map((s) => (
            <tr key={s.student_id} className="hover:bg-gray-50">
              <td className="px-4 py-3.5">
                <p className="font-semibold text-gray-800 text-sm">{s.full_name}</p>
                <p className="text-xs text-gray-400">{s.student_number}</p>
              </td>
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-20">
                    <div
                      className={`h-1.5 rounded-full ${s.attendance_pct >= 80 ? 'bg-emerald-500' : s.attendance_pct >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${s.attendance_pct}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-gray-700">{s.attendance_pct}%</span>
                </div>
              </td>
              <td className="px-4 py-3.5 text-gray-600">{s.grade_breakdown?.FULL || 0}</td>
              <td className="px-4 py-3.5 text-gray-600">{s.grade_breakdown?.PARTIAL || 0}</td>
              <td className="px-4 py-3.5 text-gray-600">{s.grade_breakdown?.ABSENT || 0}</td>
              <td className="px-4 py-3.5">
                <Badge variant={gradeColor(s.attendance_pct)}>
                  {s.attendance_pct >= 80 ? 'Good' : s.attendance_pct >= 60 ? 'At Risk' : 'Critical'}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}