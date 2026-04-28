import { useEffect, useState } from 'react'
import { UserPlus, Search, MoreHorizontal, ShieldCheck, ShieldOff } from 'lucide-react'
import { adminApi } from '../../services/api'
import { Page, Card, Button, Input, Select, Modal, Badge, Table, Empty, Spinner, Pagination } from '../../components/ui'
import toast from 'react-hot-toast'

const ROLES = ['SYSTEM_ADMIN','PROGRAMME_DIRECTOR','LECTURER','MODULE_COORDINATOR']

const roleBadge = (role) => {
  const map = {
    SYSTEM_ADMIN       : 'red',
    PROGRAMME_DIRECTOR : 'green',
    LECTURER           : 'blue',
    MODULE_COORDINATOR : 'amber',
  }
  return <Badge variant={map[role] || 'gray'}>{role.replace(/_/g,' ')}</Badge>
}

const PAGE_SIZE = 10

export default function AdminUsers() {
  const [users, setUsers]     = useState([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [modal, setModal]     = useState(false)
  const [saving, setSaving]   = useState(false)
  const [form, setForm]       = useState({
    email:'', full_name:'', password:'', role:'LECTURER', department_id:''
  })

  const load = (p = 1) => {
    setLoading(true)
    adminApi.users({ page: p, page_size: PAGE_SIZE })
      .then(r => {
        setUsers(r.data.items)
        setTotal(r.data.total)
        setPage(r.data.page)
      })
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(1) }, [])

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await adminApi.createUser(form)
      toast.success('User created successfully')
      setModal(false)
      setForm({ email:'', full_name:'', password:'', role:'LECTURER', department_id:'' })
      load(1)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (user) => {
    try {
      await adminApi.updateUser(user.id, { is_active: !user.is_active })
      toast.success(user.is_active ? 'User deactivated' : 'User activated')
      load(page)
    } catch {
      toast.error('Failed to update user')
    }
  }

  const columns = [
    { key: 'full_name',   label: 'Name',
      render: (v, row) => (
        <div>
          <p className="font-semibold text-gray-800 text-sm">{v}</p>
          <p className="text-xs text-gray-400">{row.email}</p>
        </div>
      )
    },
    { key: 'role',        label: 'Role',      render: (v) => roleBadge(v) },
    { key: 'totp_enabled',label: '2FA',
      render: (v) => v
        ? <Badge variant="green">Enabled</Badge>
        : <Badge variant="gray">Pending</Badge>
    },
    { key: 'is_active',   label: 'Status',
      render: (v) => v
        ? <Badge variant="green">Active</Badge>
        : <Badge variant="red">Inactive</Badge>
    },
    { key: 'id', label: '',
      render: (_, row) => (
        <button
          onClick={(e) => { e.stopPropagation(); toggleActive(row) }}
          className="btn-ghost btn-sm"
        >
          {row.is_active ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
        </button>
      )
    },
  ]

  return (
    <Page
      title="Staff Users"
      subtitle="Manage lecturer, director and coordinator accounts"
      actions={
        <Button onClick={() => setModal(true)}>
          <UserPlus size={15} /> Add User
        </Button>
      }
    >
      <Card padding={false}>
        {/* Search bar */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-9 py-2 text-sm"
              placeholder="Search users..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner size={20} className="text-gray-300" /></div>
        ) : filtered.length === 0 ? (
          <Empty icon={<Users size={20} />} title="No users found" />
        ) : (
          <>
            <Table columns={columns} data={filtered} />
            {total > PAGE_SIZE && (
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={total}
                onPageChange={(p) => { setPage(p); load(p) }}
              />
            )}
          </>
        )}
      </Card>

      {/* Create user modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Add Staff User">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Full Name"      value={form.full_name}  onChange={e => setForm({...form, full_name: e.target.value})}  placeholder="Dr. Jane Smith" required />
          <Input label="Email"          type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="jane@university.ie" required />
          <Input label="Password"       type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Min 8 characters" required />
          <Select label="Role" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
            {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g,' ')}</option>)}
          </Select>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">Create User</Button>
          </div>
        </form>
      </Modal>
    </Page>
  )
}