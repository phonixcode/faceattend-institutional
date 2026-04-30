import { useEffect, useState } from 'react'
import { BookOpen, Plus, X, User, GraduationCap, Hash, Calendar } from 'lucide-react'
import { adminApi } from '../../services/api'
import { Page, Card, Button, Input, Select, Modal, Badge, Empty, Spinner, Table, Pagination } from '../../components/ui'
import toast from 'react-hot-toast'

const PAGE_SIZE    = 10
const CURRENT_YEAR = new Date().getFullYear()

const emptyForm = {
  module_code: '', module_name: '', programme_id: '',
  lecturer_id: '', year_of_study: 1,
  academic_year: `${CURRENT_YEAR}/${CURRENT_YEAR + 1}`, semester: '1',
}

export default function AdminModules() {
  const [modules, setModules]     = useState([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [progs, setProgs]         = useState([])
  const [lecturers, setLecturers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(false)
  const [saving, setSaving]       = useState(false)
  const [detail, setDetail]       = useState(null)
  const [form, setForm]           = useState(emptyForm)

  const load = async (p = 1) => {
    setLoading(true)
    try {
      const [m, progsRes, u] = await Promise.all([
        adminApi.modules({ page: p, page_size: PAGE_SIZE }),
        adminApi.programmes({ page: 1, page_size: 500 }),
        adminApi.users({ page: 1, page_size: 500 })
      ])
      setModules(m.data.items)
      setTotal(m.data.total)
      setPage(m.data.page)
      setProgs(progsRes.data.items)
      setLecturers(u.data.items.filter(usr => ['LECTURER', 'SYSTEM_ADMIN'].includes(usr.role)))
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }

  useEffect(() => { load(1) }, [])

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await adminApi.createModule(form)
      toast.success('Module created')
      setModal(false)
      setForm(emptyForm)
      load(1)
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    finally { setSaving(false) }
  }

  const getProgName = (id) => progs.find(p => p.id === id)?.name || '—'
  const getLecName  = (id) => lecturers.find(l => l.id === id)?.full_name || '—'

  const columns = [
    {
      key: 'module_code', label: 'Code',
      render: (v) => (
        <span className="inline-block px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg">{v}</span>
      )
    },
    {
      key: 'module_name', label: 'Module',
      render: (v) => <span className="font-semibold text-sm text-gray-800">{v}</span>
    },
    { key: 'programme_id', label: 'Programme',  render: (v) => <span className="text-xs">{getProgName(v)}</span> },
    { key: 'lecturer_id',  label: 'Lecturer',   render: (v) => <span className="text-xs">{getLecName(v)}</span> },
    {
      key: 'year_of_study', label: 'Year',
      render: (v) => <span className="text-xs font-semibold text-gray-600">Year {v}</span>
    },
    { key: 'semester', label: 'Sem', render: (v) => <span className="text-xs">S{v}</span> },
    {
      key: 'is_active', label: 'Status',
      render: (v) => <Badge variant={v ? 'green' : 'gray'}>{v ? 'Active' : 'Inactive'}</Badge>
    },
  ]

  return (
    <Page
      title="Modules"
      subtitle="All modules across all programmes"
      actions={<Button onClick={() => setModal(true)}><Plus size={14} /> Add Module</Button>}
    >
      <Card padding={false}>
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size={20} className="text-gray-300" /></div>
        ) : modules.length === 0 ? (
          <Empty
            icon={<BookOpen size={20} />}
            title="No modules yet"
            action={<Button onClick={() => setModal(true)}><Plus size={14} /> Add Module</Button>}
          />
        ) : (
          <>
            <Table columns={columns} data={modules} onRow={(row) => setDetail(row)} />
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

      {/* ── Create module modal ── */}
      <Modal open={modal} onClose={() => setModal(false)} title="Add Module" width="max-w-lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Module Code"
              value={form.module_code}
              onChange={e => setForm({ ...form, module_code: e.target.value })}
              placeholder="CS401"
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
            label="Module Name"
            value={form.module_name}
            onChange={e => setForm({ ...form, module_name: e.target.value })}
            placeholder="Deep Learning"
            required
          />
          <Select
            label="Programme"
            value={form.programme_id}
            onChange={e => setForm({ ...form, programme_id: e.target.value })}
            required
          >
            <option value="">Select programme...</option>
            {progs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Select
            label="Lecturer"
            value={form.lecturer_id}
            onChange={e => setForm({ ...form, lecturer_id: e.target.value })}
            required
          >
            <option value="">Select lecturer...</option>
            {lecturers.map(l => <option key={l.id} value={l.id}>{l.full_name}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Academic Year"
              value={form.academic_year}
              onChange={e => setForm({ ...form, academic_year: e.target.value })}
              placeholder={`${CURRENT_YEAR}/${CURRENT_YEAR + 1}`}
            />
            <Select
              label="Semester"
              value={form.semester}
              onChange={e => setForm({ ...form, semester: e.target.value })}
            >
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
            </Select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">Create Module</Button>
          </div>
        </form>
      </Modal>

      {/* ── Module detail drawer ── */}
      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setDetail(null)} />
          <div className="relative w-full max-w-sm bg-white h-full shadow-2xl overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="font-bold text-gray-900">Module Details</h2>
              <button
                onClick={() => setDetail(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-400"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Code + name */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                  <BookOpen size={22} className="text-white" />
                </div>
                <div>
                  <span className="inline-block text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md mb-1">
                    {detail.module_code}
                  </span>
                  <p className="font-bold text-gray-900 text-base leading-tight">{detail.module_name}</p>
                  <Badge variant={detail.is_active ? 'green' : 'gray'} className="mt-1">
                    {detail.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3">
                <ModuleRow icon={<GraduationCap size={14} />} label="Programme"    value={getProgName(detail.programme_id)} />
                <ModuleRow icon={<User size={14} />}          label="Lecturer"     value={getLecName(detail.lecturer_id)} />
                <ModuleRow icon={<Hash size={14} />}          label="Year of Study" value={`Year ${detail.year_of_study}`} />
                <ModuleRow icon={<Calendar size={14} />}      label="Academic Year" value={detail.academic_year} />
                <ModuleRow icon={<BookOpen size={14} />}      label="Semester"     value={`Semester ${detail.semester}`} />
              </div>
            </div>
          </div>
        </div>
      )}
    </Page>
  )
}

function ModuleRow({ icon, label, value }) {
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
