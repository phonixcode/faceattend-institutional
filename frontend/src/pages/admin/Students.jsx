import { useEffect, useState } from 'react'
import { Users, Plus, Search, CheckCircle, XCircle } from 'lucide-react'
import { adminApi } from '../../services/api'
import { Page, Card, Button, Input, Select, Modal, Badge, Empty, Spinner, Table, Pagination } from '../../components/ui'
import toast from 'react-hot-toast'

const PAGE_SIZE = 10

export default function AdminStudents() {
  const [students, setStudents] = useState([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [progs, setProgs]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [modal, setModal]       = useState(false)
  const [saving, setSaving]     = useState(false)
  const [form, setForm]         = useState({
    student_number:'', full_name:'', email:'',
    password:'', programme_id:'', year_of_study: 1
  })

  const load = async (p = 1) => {
    setLoading(true)
    try {
      const [s, progsRes] = await Promise.all([
        adminApi.students({ page: p, page_size: PAGE_SIZE }),
        adminApi.programmes({ page: 1, page_size: 500 })
      ])
      setStudents(s.data.items)
      setTotal(s.data.total)
      setPage(s.data.page)
      setProgs(progsRes.data.items)
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }

  useEffect(() => { load(1) }, [])

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
      setForm({ student_number:'', full_name:'', email:'', password:'', programme_id:'', year_of_study:1 })
      load(1)
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    finally { setSaving(false) }
  }

  const getProgName = (id) => progs.find(p => p.id === id)?.name || '—'

  const columns = [
    { key: 'full_name', label: 'Student',
      render: (v, row) => (
        <div>
          <p className="font-semibold text-sm text-gray-800">{v}</p>
          <p className="text-xs text-gray-400">{row.student_number}</p>
        </div>
      )
    },
    { key: 'email',        label: 'Email',      render: (v) => <span className="text-xs text-gray-500">{v}</span> },
    { key: 'programme_id', label: 'Programme',  render: (v) => getProgName(v) },
    { key: 'year_of_study',label: 'Year',       render: (v) => `Year ${v}` },
    { key: 'face_registered', label: 'Face',
      render: (v) => v
        ? <Badge variant="green"><CheckCircle size={11}/> Registered</Badge>
        : <Badge variant="amber">Pending</Badge>
    },
    { key: 'is_active', label: 'Status',
      render: (v) => <Badge variant={v ? 'green':'red'}>{v ? 'Active':'Inactive'}</Badge> },
  ]

  return (
    <Page
      title="Students"
      subtitle="All student accounts across all programmes"
      actions={<Button onClick={() => setModal(true)}><Plus size={14} /> Add Student</Button>}
    >
      <Card padding={false}>
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9 py-2 text-sm" placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size={20} className="text-gray-300" /></div>
        ) : filtered.length === 0 ? (
          <Empty icon={<Users size={20} />} title="No students found" />
        ) : (
          <>
            <Table columns={columns} data={filtered} />
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

      <Modal open={modal} onClose={() => setModal(false)} title="Add Student" width="max-w-lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Student Number" value={form.student_number} onChange={e => setForm({...form, student_number: e.target.value})} placeholder="STU2024001" required />
            <Select label="Year of Study" value={form.year_of_study} onChange={e => setForm({...form, year_of_study: parseInt(e.target.value)})}>
              {[1,2,3,4].map(y => <option key={y} value={y}>Year {y}</option>)}
            </Select>
          </div>
          <Input label="Full Name"  value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} placeholder="John Adeyemi" required />
          <Input label="Email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="john@student.ie" required />
          <Input label="Password" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Temporary password" required />
          <Select label="Programme" value={form.programme_id} onChange={e => setForm({...form, programme_id: e.target.value})}>
            <option value="">Select programme...</option>
            {progs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">Create Student</Button>
          </div>
        </form>
      </Modal>
    </Page>
  )
}