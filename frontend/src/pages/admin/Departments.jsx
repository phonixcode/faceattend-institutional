import { useEffect, useState } from 'react'
import { Building2, Plus, Trash2 } from 'lucide-react'
import { adminApi } from '../../services/api'
import { Page, Card, Button, Input, Select, Modal, Empty, Spinner, Table } from '../../components/ui'
import toast from 'react-hot-toast'

export default function AdminDepartments() {
  const [depts, setDepts]     = useState([])
  const [unis, setUnis]       = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(false)
  const [uniModal, setUniModal] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [form, setForm]       = useState({ name:'', university_id:'' })
  const [uniForm, setUniForm] = useState({ name:'', country:'Ireland' })

  const load = async () => {
    setLoading(true)
    try {
      const [d, u] = await Promise.all([adminApi.departments(), adminApi.universities()])
      setDepts(d.data); setUnis(u.data)
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleCreateUni = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await adminApi.createUniversity(uniForm)
      toast.success('University created')
      setUniModal(false); setUniForm({ name:'', country:'Ireland' }); load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    finally { setSaving(false) }
  }

  const handleCreateDept = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await adminApi.createDepartment(form)
      toast.success('Department created')
      setModal(false); setForm({ name:'', university_id:'' }); load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    finally { setSaving(false) }
  }

  const getUniName = (id) => unis.find(u => u.id === id)?.name || '—'

  const columns = [
    { key: 'name', label: 'Department',
      render: (v) => <span className="font-semibold text-sm text-gray-800">{v}</span> },
    { key: 'university_id', label: 'University', render: (v) => getUniName(v) },
    { key: 'created_at', label: 'Created',
      render: (v) => new Date(v).toLocaleDateString('en-IE') },
  ]

  return (
    <Page
      title="Departments"
      subtitle="Manage universities and academic departments"
      actions={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setUniModal(true)}>
            <Plus size={14} /> University
          </Button>
          <Button onClick={() => setModal(true)} disabled={unis.length === 0}>
            <Plus size={14} /> Department
          </Button>
        </div>
      }
    >
      {/* Universities summary */}
      {unis.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {unis.map(u => (
            <Card key={u.id}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Building2 size={18} className="text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-gray-800 truncate">{u.name}</p>
                  <p className="text-xs text-gray-400">{u.country}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card padding={false}>
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size={20} className="text-gray-300" /></div>
        ) : depts.length === 0 ? (
          <Empty icon={<Building2 size={20} />} title="No departments yet"
            description="Add a university first, then create departments"
            action={<Button onClick={() => setUniModal(true)}><Plus size={14}/>Add University</Button>}
          />
        ) : (
          <Table columns={columns} data={depts} />
        )}
      </Card>

      <Modal open={uniModal} onClose={() => setUniModal(false)} title="Add University">
        <form onSubmit={handleCreateUni} className="space-y-4">
          <Input label="University Name" value={uniForm.name} onChange={e => setUniForm({...uniForm, name: e.target.value})} placeholder="University College Dublin" required />
          <Input label="Country" value={uniForm.country} onChange={e => setUniForm({...uniForm, country: e.target.value})} placeholder="Ireland" />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setUniModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">Create</Button>
          </div>
        </form>
      </Modal>

      <Modal open={modal} onClose={() => setModal(false)} title="Add Department">
        <form onSubmit={handleCreateDept} className="space-y-4">
          <Input label="Department Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="School of Computer Science" required />
          <Select label="University" value={form.university_id} onChange={e => setForm({...form, university_id: e.target.value})} required>
            <option value="">Select university...</option>
            {unis.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
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