import { useEffect, useState } from 'react'
import {
  UserPlus, Search, ShieldCheck, ShieldOff,
  X, Mail, Shield, Building2, CheckCircle, XCircle
} from 'lucide-react'
import { adminApi } from '../../services/api'
import { Page, Card, Button, Input, Select, Modal, Badge, Table, Empty, Spinner, Pagination } from '../../components/ui'
import toast from 'react-hot-toast'

const ROLES = ['SYSTEM_ADMIN', 'PROGRAMME_DIRECTOR', 'LECTURER', 'MODULE_COORDINATOR']

const ROLE_COLOR = {
  SYSTEM_ADMIN       : 'red',
  PROGRAMME_DIRECTOR : 'green',
  LECTURER           : 'blue',
  MODULE_COORDINATOR : 'amber',
}

const roleBadge = (role) => (
  <Badge variant={ROLE_COLOR[role] || 'gray'}>{role.replace(/_/g, ' ')}</Badge>
)

const PAGE_SIZE = 10

export default function AdminUsers() {
  const [users, setUsers]     = useState([])
  const [depts, setDepts]     = useState([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [modal, setModal]     = useState(false)
  const [saving, setSaving]   = useState(false)
  const [toggling, setToggling] = useState(null)
  const [detail, setDetail]   = useState(null)
  const [form, setForm]       = useState({
    email: '', full_name: '', password: '', role: 'LECTURER', department_id: ''
  })

  const load = async (p = 1) => {
    setLoading(true)
    try {
      const [u, d] = await Promise.all([
        adminApi.users({ page: p, page_size: PAGE_SIZE }),
        adminApi.departments(),
      ])
      setUsers(u.data.items)
      setTotal(u.data.total)
      setPage(u.data.page)
      setDepts(d.data)
    } catch { toast.error('Failed to load users') }
    finally { setLoading(false) }
  }

  useEffect(() => { load(1) }, [])

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await adminApi.createUser(form)
      toast.success('User created successfully')
      setModal(false)
      setForm({ email: '', full_name: '', password: '', role: 'LECTURER', department_id: '' })
      load(1)
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to create user') }
    finally { setSaving(false) }
  }

  const handleToggle = async (user, e) => {
    if (e) e.stopPropagation()
    setToggling(user.id)
    try {
      await adminApi.updateUser(user.id, { is_active: !user.is_active })
      const action = user.is_active ? 'Deactivated' : 'Activated'
      toast.success(`${action}: ${user.full_name}`)
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u))
      if (detail?.id === user.id) setDetail(prev => ({ ...prev, is_active: !prev.is_active }))
    } catch { toast.error('Failed to update user') }
    finally { setToggling(null) }
  }

  const getDeptName = (id) => depts.find(d => d.id === id)?.name || '—'

  const columns = [
    {
      key: 'full_name', label: 'Name',
      render: (v, row) => (
        <div>
          <p className="font-semibold text-gray-800 text-sm">{v}</p>
          <p className="text-xs text-gray-400">{row.email}</p>
        </div>
      )
    },
    { key: 'role',         label: 'Role', render: (v) => roleBadge(v) },
    {
      key: 'totp_enabled', label: '2FA',
      render: (v) => v
        ? <Badge variant="green">Enabled</Badge>
        : <Badge variant="gray">Pending</Badge>
    },
    {
      key: 'is_active', label: 'Status',
      render: (v) => v
        ? <Badge variant="green">Active</Badge>
        : <Badge variant="red">Inactive</Badge>
    },
    {
      key: 'id', label: '',
      render: (_, row) => (
        <button
          onClick={(e) => handleToggle(row, e)}
          disabled={toggling === row.id}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400 hover:text-gray-600"
          title={row.is_active ? 'Deactivate' : 'Activate'}
        >
          {toggling === row.id
            ? <Spinner size={14} className="text-gray-300" />
            : row.is_active ? <ShieldOff size={14} /> : <ShieldCheck size={14} />
          }
        </button>
      )
    },
  ]

  return (
    <Page
      title="Staff Users"
      subtitle="Manage lecturer, director and coordinator accounts"
      actions={<Button onClick={() => setModal(true)}><UserPlus size={15} /> Add User</Button>}
    >
      <Card padding={false}>
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
          <Empty icon={<UserPlus size={20} />} title="No users found" />
        ) : (
          <>
            <Table columns={columns} data={filtered} onRow={(row) => setDetail(row)} />
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

      {/* ── Create user modal ── */}
      <Modal open={modal} onClose={() => setModal(false)} title="Add Staff User">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Full Name" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Dr. Jane Smith" required />
          <Input label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="jane@university.ie" required />
          <Input label="Password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min 8 characters" required />
          <Select label="Role" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
            {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
          </Select>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">Create User</Button>
          </div>
        </form>
      </Modal>

      {/* ── User detail drawer ── */}
      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setDetail(null)} />
          <div className="relative w-full max-w-sm bg-white h-full shadow-2xl overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="font-bold text-gray-900">User Details</h2>
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
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                  {detail.full_name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-base">{detail.full_name}</p>
                  <p className="text-sm text-gray-400">{detail.email}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {roleBadge(detail.role)}
                    <Badge variant={detail.is_active ? 'green' : 'red'}>
                      {detail.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <UserRow icon={<Mail size={14} />}     label="Email"      value={detail.email} />
                <UserRow icon={<Shield size={14} />}   label="Role"       value={detail.role.replace(/_/g, ' ')} />
                <UserRow icon={<Building2 size={14} />} label="Department" value={getDeptName(detail.department_id)} />
                <UserRow icon={<CheckCircle size={14} />} label="2FA"      value={detail.totp_enabled ? 'Enabled' : 'Not set up'} />
              </div>

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
                    ? 'User will no longer be able to log in.'
                    : 'User will regain access to their account.'
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

function UserRow({ icon, label, value }) {
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
