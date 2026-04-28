import { useEffect, useState } from 'react'
import { BookOpen, Plus } from 'lucide-react'
import { adminApi } from '../../services/api'
import { Page, Card, Button, Input, Select, Modal, Badge, Empty, Spinner, Table, Pagination } from '../../components/ui'
import toast from 'react-hot-toast'

const PAGE_SIZE = 10

export default function AdminModules() {
  const [modules, setModules]   = useState([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [progs, setProgs]       = useState([])
  const [lecturers, setLecturers] = useState([])
  const [loading, setLoading]  = useState(true)
  const [modal, setModal]       = useState(false)
  const [saving, setSaving]     = useState(false)
  const [form, setForm]         = useState({
    module_code:'', module_name:'', programme_id:'',
    lecturer_id:'', academic_year:'2024/2025', semester:'1'
  })

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
      setLecturers(u.data.items.filter(usr => ['LECTURER','SYSTEM_ADMIN'].includes(usr.role)))
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
      setForm({ module_code:'', module_name:'', programme_id:'', lecturer_id:'', academic_year:'2024/2025', semester:'1' })
      load(1)
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    finally { setSaving(false) }
  }

  const getProgName  = (id) => progs.find(p => p.id === id)?.name || '—'
  const getLecName   = (id) => lecturers.find(l => l.id === id)?.full_name || '—'

  const columns = [
    { key: 'module_code', label: 'Code',
      render: (v) => (
        <span className="inline-block px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg">{v}</span>
      )
    },
    { key: 'module_name',  label: 'Module',
      render: (v) => <span className="font-semibold text-sm text-gray-800">{v}</span> },
    { key: 'programme_id', label: 'Programme', render: (v) => getProgName(v) },
    { key: 'lecturer_id',  label: 'Lecturer',  render: (v) => getLecName(v) },
    { key: 'semester',     label: 'Semester',  render: (v) => `Semester ${v}` },
    { key: 'is_active', label: 'Status',
      render: (v) => <Badge variant={v ? 'green' : 'gray'}>{v ? 'Active' : 'Inactive'}</Badge> },
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
          <Empty icon={<BookOpen size={20} />} title="No modules yet"
            action={<Button onClick={() => setModal(true)}><Plus size={14}/>Add Module</Button>}
          />
        ) : (
          <>
            <Table columns={columns} data={modules} />
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

      <Modal open={modal} onClose={() => setModal(false)} title="Add Module" width="max-w-lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Module Code" value={form.module_code} onChange={e => setForm({...form, module_code: e.target.value})} placeholder="CS401" required />
            <Select label="Semester" value={form.semester} onChange={e => setForm({...form, semester: e.target.value})}>
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
            </Select>
          </div>
          <Input label="Module Name" value={form.module_name} onChange={e => setForm({...form, module_name: e.target.value})} placeholder="Deep Learning" required />
          <Select label="Programme" value={form.programme_id} onChange={e => setForm({...form, programme_id: e.target.value})} required>
            <option value="">Select programme...</option>
            {progs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Select label="Lecturer" value={form.lecturer_id} onChange={e => setForm({...form, lecturer_id: e.target.value})} required>
            <option value="">Select lecturer...</option>
            {lecturers.map(l => <option key={l.id} value={l.id}>{l.full_name}</option>)}
          </Select>
          <Input label="Academic Year" value={form.academic_year} onChange={e => setForm({...form, academic_year: e.target.value})} placeholder="2024/2025" />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">Create Module</Button>
          </div>
        </form>
      </Modal>
    </Page>
  )
}