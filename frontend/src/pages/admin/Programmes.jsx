import { useEffect, useState } from 'react'
import { GraduationCap, Plus } from 'lucide-react'
import { adminApi } from '../../services/api'
import { Page, Card, Button, Input, Select, Modal, Badge, Empty, Spinner, Table, Pagination } from '../../components/ui'
import toast from 'react-hot-toast'

const PAGE_SIZE = 10

export default function AdminProgrammes() {
  const [progs, setProgs]     = useState([])
  const [total, setTotal]    = useState(0)
  const [page, setPage]      = useState(1)
  const [depts, setDepts]    = useState([])
  const [users, setUsers]    = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]    = useState(false)
  const [saving, setSaving]   = useState(false)
  const [form, setForm]      = useState({ name:'', department_id:'', director_id:'' })

  const load = async (p = 1) => {
    setLoading(true)
    try {
      const [progsRes, d, u] = await Promise.all([
        adminApi.programmes({ page: p, page_size: PAGE_SIZE }),
        adminApi.departments(),
        adminApi.users({ page: 1, page_size: 500 })
      ])
      setProgs(progsRes.data.items)
      setTotal(progsRes.data.total)
      setPage(progsRes.data.page)
      setDepts(d.data)
      setUsers(u.data.items.filter(usr => usr.role === 'PROGRAMME_DIRECTOR'))
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }

  useEffect(() => { load(1) }, [])

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await adminApi.createProgramme(form)
      toast.success('Programme created')
      setModal(false); setForm({ name:'', department_id:'', director_id:'' }); load(1)
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    finally { setSaving(false) }
  }

  const getDeptName = (id) => depts.find(d => d.id === id)?.name || '—'
  const getDirectorName = (id) => users.find(u => u.id === id)?.full_name || 'Unassigned'

  const columns = [
    { key: 'name', label: 'Programme',
      render: (v) => <span className="font-semibold text-sm text-gray-800">{v}</span> },
    { key: 'department_id', label: 'Department', render: (v) => getDeptName(v) },
    { key: 'director_id',   label: 'Director',   render: (v) => getDirectorName(v) },
    { key: 'is_active', label: 'Status',
      render: (v) => <Badge variant={v ? 'green' : 'gray'}>{v ? 'Active' : 'Inactive'}</Badge> },
  ]

  return (
    <Page
      title="Programmes"
      subtitle="Degree programmes and their directors"
      actions={
        <Button onClick={() => setModal(true)}>
          <Plus size={14} /> Add Programme
        </Button>
      }
    >
      <Card padding={false}>
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size={20} className="text-gray-300" /></div>
        ) : progs.length === 0 ? (
          <Empty icon={<GraduationCap size={20} />} title="No programmes yet"
            action={<Button onClick={() => setModal(true)}><Plus size={14}/>Add Programme</Button>}
          />
        ) : (
          <>
            <Table columns={columns} data={progs} />
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

      <Modal open={modal} onClose={() => setModal(false)} title="Add Programme">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Programme Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="BSc Computer Science" required />
          <Select label="Department" value={form.department_id} onChange={e => setForm({...form, department_id: e.target.value})} required>
            <option value="">Select department...</option>
            {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
          <Select label="Programme Director (optional)" value={form.director_id} onChange={e => setForm({...form, director_id: e.target.value})}>
            <option value="">Assign later...</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
          </Select>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">Create</Button>
          </div>
        </form>
      </Modal>
    </Page>
  )
}