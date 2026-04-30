import { useEffect, useState } from 'react'
import { Users, Search, CheckCircle, X, Mail, BookOpen, Calendar, ToggleLeft, ToggleRight } from 'lucide-react'
import { lecturerApi } from '../../services/api'
import { Page, Card, Badge, Empty, Spinner, Pagination } from '../../components/ui'
import toast from 'react-hot-toast'

const PAGE_SIZE = 10

export default function LecturerStudents() {
  const [modules, setModules]   = useState([])
  const [selected, setSelected] = useState('')
  const [students, setStudents] = useState([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [loading, setLoading]   = useState(false)
  const [search, setSearch]     = useState('')
  const [detail, setDetail]     = useState(null)
  const [detailMod, setDetailMod] = useState(null)

  useEffect(() => {
    lecturerApi.modules()
      .then(r => {
        setModules(r.data)
        if (r.data.length > 0) setSelected(r.data[0].id)
      })
      .catch(() => toast.error('Failed to load modules'))
  }, [])

  const loadStudents = (p = 1) => {
    if (!selected) return
    setLoading(true)
    lecturerApi.students(selected, { page: p, page_size: PAGE_SIZE })
      .then(r => {
        setStudents(r.data.items)
        setTotal(r.data.total)
        setPage(r.data.page)
      })
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!selected) return
    setDetail(null)
    loadStudents(1)
    setDetailMod(modules.find(m => m.id === selected))
  }, [selected])

  const openDetail = (student) => {
    setDetail(student)
  }

  const filtered = students.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.student_number.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Page title="Students" subtitle="Students enrolled in your modules">
      {/* Module selector + search */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select
          className="input py-2 text-sm max-w-xs"
          value={selected}
          onChange={e => setSelected(e.target.value)}
        >
          {modules.map(m => (
            <option key={m.id} value={m.id}>{m.module_code} — {m.module_name}</option>
          ))}
        </select>
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9 py-2 text-sm"
            placeholder="Search students..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card padding={false}>
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size={20} className="text-gray-300" /></div>
        ) : filtered.length === 0 ? (
          <Empty icon={<Users size={20} />} title="No students found" />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Student', 'Email', 'Year', 'Face', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(s => (
                  <tr
                    key={s.id}
                    onClick={() => openDetail(s)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-gray-800 text-sm">{s.full_name}</p>
                      <p className="text-xs text-gray-400">{s.student_number}</p>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-500">{s.email}</td>
                    <td className="px-4 py-3.5 text-gray-600 text-sm">Year {s.year_of_study}</td>
                    <td className="px-4 py-3.5">
                      {s.face_registered
                        ? <Badge variant="green"><CheckCircle size={11} /> Registered</Badge>
                        : <Badge variant="amber">Pending</Badge>
                      }
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={s.is_active ? 'green' : 'red'}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {total > PAGE_SIZE && (
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={total}
                onPageChange={(p) => loadStudents(p)}
              />
            )}
          </>
        )}
      </Card>

      {/* ── Student detail drawer ── */}
      {detail && (
        <StudentDetailDrawer
          student={detail}
          module={detailMod}
          onClose={() => setDetail(null)}
        />
      )}
    </Page>
  )
}


function StudentDetailDrawer({ student, module, onClose }) {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!module?.id) { setLoading(false); return }
    lecturerApi.report(module.id)
      .then(r => {
        const studentRow = r.data?.students?.find(s => s.student_id === student.id)
        setReport(studentRow || null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [student.id, module?.id])

  const pct = report?.attendance_pct ?? null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white h-full shadow-2xl overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-gray-900">Student Details</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-400"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Avatar + name */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              {student.full_name.charAt(0)}
            </div>
            <div>
              <p className="font-bold text-gray-900 text-base">{student.full_name}</p>
              <p className="text-sm text-gray-400">{student.student_number}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <Badge variant={student.is_active ? 'green' : 'red'}>
                  {student.is_active ? 'Active' : 'Inactive'}
                </Badge>
                <Badge variant={student.face_registered ? 'green' : 'amber'}>
                  {student.face_registered ? 'Face ✓' : 'Face pending'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Student info */}
          <div className="space-y-3">
            <DrawerRow icon={<Mail size={14} />}     label="Email"        value={student.email} />
            <DrawerRow icon={<BookOpen size={14} />} label="Module"       value={module ? `${module.module_code} — ${module.module_name}` : '—'} />
            <DrawerRow icon={<Calendar size={14} />} label="Year of Study" value={`Year ${student.year_of_study}`} />
          </div>

          {/* Attendance for this module */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
              Attendance — {module?.module_code}
            </p>
            {loading ? (
              <div className="flex justify-center py-4"><Spinner size={16} className="text-gray-300" /></div>
            ) : report === null ? (
              <p className="text-sm text-gray-400 text-center py-4">No attendance data yet</p>
            ) : (
              <div className="space-y-3">
                {/* Big percentage */}
                <div className={`rounded-2xl p-4 text-center ${
                  pct >= 80 ? 'bg-emerald-50' : pct >= 60 ? 'bg-amber-50' : 'bg-red-50'
                }`}>
                  <p className={`text-4xl font-bold ${
                    pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {pct}%
                  </p>
                  <p className="text-xs font-medium text-gray-500 mt-1">
                    {report.lectures_attended} of {report.lectures_total} lectures attended
                  </p>
                  {pct < 80 && (
                    <Badge variant={pct < 60 ? 'red' : 'amber'} className="mt-2">
                      {pct < 60 ? 'Critical' : 'At Risk'}
                    </Badge>
                  )}
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Grade breakdown if available */}
                {report.grade_breakdown && (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {Object.entries(report.grade_breakdown).map(([grade, count]) => (
                      <div key={grade} className="bg-gray-50 rounded-xl p-2 text-center">
                        <p className="text-sm font-bold text-gray-800">{count}</p>
                        <p className="text-xs text-gray-400">{grade}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function DrawerRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-800 truncate">{value || '—'}</p>
      </div>
    </div>
  )
}
