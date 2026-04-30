import { useEffect, useState } from 'react'
import {
  UserCheck, Users, BookOpen, Plus, X, ChevronRight,
  CheckCircle, ToggleLeft, ToggleRight, Mail, GraduationCap,
  Calendar, Hash
} from 'lucide-react'
import { adminApi } from '../../services/api'
import { Page, Card, Button, Badge, Empty, Spinner, Input, Select, Modal } from '../../components/ui'
import toast from 'react-hot-toast'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS        = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR + 1 - i)

const emptyForm = {
  student_number: '', full_name: '', email: '',
  password: '', programme_id: '', year_of_study: 1,
  admission_year: CURRENT_YEAR,
}

export default function AdminAdmissions() {
  const [cohorts, setCohorts]   = useState([])
  const [progs, setProgs]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [yearFilter, setYearFilter] = useState(CURRENT_YEAR)
  const [activeCohort, setActiveCohort] = useState(null)   // { programme_id, admission_year }
  const [cohortStudents, setCohortStudents] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [modal, setModal]       = useState(false)
  const [saving, setSaving]     = useState(false)
  const [toggling, setToggling] = useState(null)
  const [form, setForm]         = useState(emptyForm)

  const load = async () => {
    setLoading(true)
    try {
      const [c, progsRes] = await Promise.all([
        adminApi.admissionCohorts(),
        adminApi.programmes({ page: 1, page_size: 500 }),
      ])
      setCohorts(c.data)
      setProgs(progsRes.data.items)
    } catch { toast.error('Failed to load admissions') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openCohort = async (cohort) => {
    setActiveCohort(cohort)
    setLoadingStudents(true)
    try {
      const r = await adminApi.students({
        programme_id  : cohort.programme_id,
        admission_year: cohort.admission_year,
        page_size     : 500,
      })
      setCohortStudents(r.data.items)
    } catch { toast.error('Failed to load students') }
    finally { setLoadingStudents(false) }
  }

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await adminApi.createStudent(form)
      toast.success('Student created and auto-enrolled')
      setModal(false)
      setForm(emptyForm)
      load()
      if (activeCohort?.programme_id === form.programme_id && activeCohort?.admission_year === form.admission_year) {
        openCohort(activeCohort)
      }
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    finally { setSaving(false) }
  }

  const handleToggle = async (student) => {
    setToggling(student.id)
    try {
      const updated = await adminApi.toggleStudent(student.id)
      const action  = updated.data.is_active ? 'Activated' : 'Deactivated'
      toast.success(`${action}: ${student.full_name}`)
      setCohortStudents(prev => prev.map(s => s.id === student.id ? updated.data : s))
    } catch { toast.error('Failed to toggle status') }
    finally { setToggling(null) }
  }

  const openAddModal = (cohort) => {
    setForm({
      ...emptyForm,
      programme_id  : cohort?.programme_id || '',
      admission_year: cohort?.admission_year || CURRENT_YEAR,
    })
    setModal(true)
  }

  const filteredCohorts = cohorts.filter(c => c.admission_year === yearFilter)
  const years = [...new Set(cohorts.map(c => c.admission_year))].sort((a, b) => b - a)

  return (
    <Page
      title="Admissions"
      subtitle="Manage student intake cohorts and enrolment"
      actions={
        <Button onClick={() => openAddModal(null)}>
          <Plus size={14} /> Add Student
        </Button>
      }
    >
      {/* Year tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {years.length === 0
          ? YEARS.map(y => (
            <button
              key={y}
              onClick={() => setYearFilter(y)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex-shrink-0 ${
                yearFilter === y
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {y} Intake
            </button>
          ))
          : years.map(y => (
            <button
              key={y}
              onClick={() => setYearFilter(y)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex-shrink-0 ${
                yearFilter === y
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {y} Intake
            </button>
          ))
        }
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={20} className="text-gray-300" /></div>
      ) : filteredCohorts.length === 0 ? (
        <Empty
          icon={<UserCheck size={20} />}
          title={`No cohorts for ${yearFilter} intake`}
          action={<Button onClick={() => openAddModal({ admission_year: yearFilter })}><Plus size={14} /> Add First Student</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCohorts.map(cohort => (
            <CohortCard
              key={`${cohort.programme_id}-${cohort.admission_year}`}
              cohort={cohort}
              onView={() => openCohort(cohort)}
              onAdd={() => openAddModal(cohort)}
            />
          ))}
        </div>
      )}

      {/* ── Cohort student drawer ── */}
      {activeCohort && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setActiveCohort(null)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-bold text-gray-900">{activeCohort.programme_name}</h2>
                <p className="text-xs text-gray-400">{activeCohort.admission_year} Intake · {cohortStudents.length} students</p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => openAddModal(activeCohort)} className="text-xs px-3 py-1.5">
                  <Plus size={13} /> Add
                </Button>
                <button
                  onClick={() => setActiveCohort(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-400"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 p-4">
              {loadingStudents ? (
                <div className="flex justify-center py-12"><Spinner size={20} className="text-gray-300" /></div>
              ) : cohortStudents.length === 0 ? (
                <Empty icon={<Users size={18} />} title="No students in this cohort" />
              ) : (
                <div className="space-y-2">
                  {cohortStudents.map(s => (
                    <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {s.full_name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-800 truncate">{s.full_name}</p>
                        <p className="text-xs text-gray-400">{s.student_number} · Year {s.year_of_study}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {s.face_registered
                          ? <CheckCircle size={14} className="text-emerald-500" />
                          : <span className="w-3.5 h-3.5 rounded-full border-2 border-amber-300" />
                        }
                        <button
                          onClick={() => handleToggle(s)}
                          disabled={toggling === s.id}
                          title={s.is_active ? 'Click to deactivate' : 'Click to activate'}
                        >
                          {toggling === s.id
                            ? <Spinner size={14} className="text-gray-300" />
                            : s.is_active
                              ? <ToggleRight size={20} className="text-emerald-500" />
                              : <ToggleLeft  size={20} className="text-gray-300" />
                          }
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Add student modal ── */}
      <Modal open={modal} onClose={() => setModal(false)} title="Add Student to Cohort" width="max-w-lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Student Number"
              value={form.student_number}
              onChange={e => setForm({ ...form, student_number: e.target.value })}
              placeholder="STU2026001"
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

          {form.programme_id && form.year_of_study && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
              <BookOpen size={13} className="text-blue-500 flex-shrink-0" />
              <p className="text-xs text-blue-700 font-medium">
                Student will be auto-enrolled in all Year {form.year_of_study} modules for this programme.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} className="flex-1">
              Create &amp; Enrol
            </Button>
          </div>
        </form>
      </Modal>
    </Page>
  )
}

function CohortCard({ cohort, onView, onAdd }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <GraduationCap size={18} className="text-white" />
        </div>
        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
          {cohort.admission_year} Intake
        </span>
      </div>

      <p className="font-bold text-gray-900 text-sm mb-1 line-clamp-2">{cohort.programme_name}</p>

      <div className="flex items-center gap-4 mt-3 mb-4">
        <div className="flex items-center gap-1.5">
          <Users size={13} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">{cohort.student_count}</span>
          <span className="text-xs text-gray-400">students</span>
        </div>
        <div className="flex items-center gap-1.5">
          <BookOpen size={13} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">{cohort.module_count}</span>
          <span className="text-xs text-gray-400">modules</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onView}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-700 transition"
        >
          <Users size={12} /> View Students
        </button>
        <button
          onClick={onAdd}
          className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-gray-900 hover:bg-gray-800 text-xs font-semibold text-white transition"
        >
          <Plus size={12} />
        </button>
      </div>
    </Card>
  )
}
