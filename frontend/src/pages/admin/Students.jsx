import { useEffect, useState } from 'react'
import {
  Users, Plus, Search, CheckCircle, XCircle,
  ChevronRight, X, ToggleLeft, ToggleRight, GraduationCap,
  BookOpen, Calendar, Mail, Hash
} from 'lucide-react'
import { adminApi } from '../../services/api'
import { Page, Card, Button, Input, Select, Modal, Badge, Empty, Spinner, Table, Pagination } from '../../components/ui'
import toast from 'react-hot-toast'

const PAGE_SIZE = 10
const YEARS     = [2027, 2026]

const emptyForm = () => ({
  student_number: '', full_name: '', email: '',
  password: '', programme_id: '', year_of_study: 1,
  admission_year: 2026,
})

export default function AdminStudents() {
  const [students, setStudents]   = useState([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [progs, setProgs]         = useState([])
  const [depts, setDepts]         = useState([])
  const [users, setUsers]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [modal, setModal]         = useState(false)
  const [saving, setSaving]       = useState(false)
  const [toggling, setToggling]   = useState(null)
  const [detail, setDetail]       = useState(null)   // student shown in side drawer
  const [form, setForm]           = useState(() => emptyForm())

  const load = async (p = 1) => {
    setLoading(true)
    try {
      const params = { page: p, page_size: PAGE_SIZE }
      if (yearFilter) params.admission_year = yearFilter

      const [s, progsRes, deptsRes, usersRes] = await Promise.all([
        adminApi.students(params),
        adminApi.programmes({ page: 1, page_size: 500 }),
        adminApi.departments(),
        adminApi.users({ page: 1, page_size: 500 }),
      ])
      setStudents(s.data.items)
      setTotal(s.data.total)
      setPage(s.data.page)
      setProgs(progsRes.data.items)
      setDepts(deptsRes.data)
      setUsers(usersRes.data.items)
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }

  useEffect(() => { load(1) }, [yearFilter])

  const filtered = students.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.student_number.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await adminApi.createStudent(form)
      toast.success('Student created')
      setModal(false)
      setForm(emptyForm())
      load(1)
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    finally { setSaving(false) }
  }

  const handleToggle = async (student, e) => {
    e.stopPropagation()
    setToggling(student.id)
    try {
      const updated = await adminApi.toggleStudent(student.id)
      const action  = updated.data.is_active ? 'Activated' : 'Deactivated'
      toast.success(`${action}: ${student.full_name}`)
      setStudents(prev => prev.map(s => s.id === student.id ? updated.data : s))
      if (detail?.id === student.id) setDetail(updated.data)
    } catch { toast.error('Failed to toggle status') }
    finally { setToggling(null) }
  }

  const getProgName = (id) => progs.find(p => p.id === id)?.name || '—'
  const getDeptName = (progId) => {
    const prog = progs.find(p => p.id === progId)
    if (!prog) return '—'
    return depts.find(d => d.id === prog.department_id)?.name || '—'
  }
  const getDirectorName = (progId) => {
    const prog = progs.find(p => p.id === progId)
    if (!prog?.director_id) return '—'
    return users.find(u => u.id === prog.director_id)?.full_name || '—'
  }

  const columns = [
    {
      key: 'full_name', label: 'Student',
      render: (v, row) => (
        <div>
          <p className="font-semibold text-sm text-gray-800">{v}</p>
          <p className="text-xs text-gray-400">{row.student_number}</p>
        </div>
      )
    },
    { key: 'email', label: 'Email', render: (v) => <span className="text-xs text-gray-500">{v}</span> },
    { key: 'programme_id', label: 'Programme', render: (v) => <span className="text-xs">{getProgName(v)}</span> },
    {
      key: 'admission_year', label: 'Cohort',
      render: (v) => <span className="text-xs font-semibold text-gray-600">{v}</span>
    },
    {
      key: 'face_registered', label: 'Face',
      render: (v) => v
        ? <Badge variant="green"><CheckCircle size={11} /> Registered</Badge>
        : <Badge variant="amber">Pending</Badge>
    },
    {
      key: 'is_active', label: 'Status',
      render: (v, row) => (
        <button
          onClick={(e) => handleToggle(row, e)}
          disabled={toggling === row.id}
          className="flex items-center gap-1.5 group"
          title={v ? 'Click to deactivate' : 'Click to activate'}
        >
          {toggling === row.id
            ? <Spinner size={14} className="text-gray-400" />
            : v
              ? <ToggleRight size={20} className="text-emerald-500 group-hover:text-emerald-600 transition" />
              : <ToggleLeft  size={20} className="text-gray-300 group-hover:text-gray-400 transition" />
          }
          <span className={`text-xs font-medium ${v ? 'text-emerald-600' : 'text-gray-400'}`}>
            {v ? 'Active' : 'Inactive'}
          </span>
        </button>
      )
    },
    {
      key: 'id', label: '',
      render: (_, row) => (
        <ChevronRight size={15} className="text-gray-300 group-hover:text-gray-500 transition" />
      )
    },
  ]

  return (
    <Page
      title="Students"
      subtitle="All student accounts across all programmes"
      actions={<Button onClick={() => setModal(true)}><Plus size={14} /> Add Student</Button>}
    >
      <Card padding={false}>
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-9 py-2 text-sm w-full"
              placeholder="Search students..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input py-2 text-sm max-w-[160px]"
            value={yearFilter}
            onChange={e => { setYearFilter(e.target.value); setSearch('') }}
          >
            <option value="">All cohorts</option>
            {YEARS.map(y => <option key={y} value={y}>{y} intake</option>)}
          </select>
          {yearFilter && (
            <button
              onClick={() => setYearFilter('')}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner size={20} className="text-gray-300" /></div>
        ) : filtered.length === 0 ? (
          <Empty icon={<Users size={20} />} title="No students found" />
        ) : (
          <>
            <Table
              columns={columns}
              data={filtered}
              onRow={(row) => setDetail(row)}
            />
            {total > PAGE_SIZE && (
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={total}
                onPageChange={(p) => load(p)}
              />
            )}
          </>
        )}
      </Card>

      {/* ── Create student modal ── */}
      <Modal open={modal} onClose={() => setModal(false)} title="Add Student" width="max-w-lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Student Number"
              value={form.student_number}
              onChange={e => setForm({ ...form, student_number: e.target.value })}
              placeholder="STU2024001"
              required
            />
            <Select
              label="Admission Year"
              value={form.admission_year}
              onChange={e => setForm({ ...form, admission_year: parseInt(e.target.value) })}
            >
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={form.full_name}
              onChange={e => setForm({ ...form, full_name: e.target.value })}
              placeholder="John Adeyemi"
              required
            />
            <Select
              label="Year of Study"
              value={form.year_of_study}
              onChange={e => setForm({ ...form, year_of_study: parseInt(e.target.value) })}
            >
              {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
            </Select>
          </div>
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            placeholder="john@student.ie"
            required
          />
          <Input
            label="Temporary Password"
            type="password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
            required
          />
          <Select
            label="Programme"
            value={form.programme_id}
            onChange={e => setForm({ ...form, programme_id: e.target.value })}
          >
            <option value="">Select programme...</option>
            {progs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} className="flex-1">
              Create Student
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Student detail side drawer ── */}
      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setDetail(null)} />
          <div className="relative w-full max-w-sm bg-white h-full shadow-2xl overflow-y-auto animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="font-bold text-gray-900">Student Details</h2>
              <button
                onClick={() => setDetail(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-400"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Avatar + name */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                  {detail.full_name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-base">{detail.full_name}</p>
                  <p className="text-sm text-gray-400">{detail.student_number}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge variant={detail.is_active ? 'green' : 'red'}>
                      {detail.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant={detail.face_registered ? 'green' : 'amber'}>
                      {detail.face_registered ? 'Face ✓' : 'Face pending'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Info grid */}
              <div className="space-y-3">
                <DetailRow icon={<Mail size={14} />}    label="Email"          value={detail.email} />
                <DetailRow icon={<GraduationCap size={14} />} label="Programme"  value={getProgName(detail.programme_id)} />
                <DetailRow icon={<Hash size={14} />}    label="Department"     value={getDeptName(detail.programme_id)} />
                <DetailRow icon={<Users size={14} />}   label="Programme Director" value={getDirectorName(detail.programme_id)} />
                <DetailRow icon={<Calendar size={14} />} label="Admission Year" value={detail.admission_year} />
                <DetailRow icon={<BookOpen size={14} />} label="Year of Study"  value={`Year ${detail.year_of_study}`} />
              </div>

              {/* Toggle active */}
              <div className="pt-2 border-t border-gray-100">
                <Button
                  variant={detail.is_active ? 'danger' : 'success'}
                  className="w-full"
                  loading={toggling === detail.id}
                  onClick={(e) => handleToggle(detail, e)}
                >
                  {detail.is_active
                    ? <><XCircle size={15} /> Deactivate Account</>
                    : <><CheckCircle size={15} /> Activate Account</>
                  }
                </Button>
                <p className="text-xs text-gray-400 text-center mt-2">
                  {detail.is_active
                    ? 'Student will no longer be able to log in.'
                    : 'Student will regain access to their account.'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </Page>
  )
}

function DetailRow({ icon, label, value }) {
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
