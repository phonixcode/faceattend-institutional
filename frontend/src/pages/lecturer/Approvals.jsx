import { useEffect, useState } from 'react'
import { Clock, UserCheck, UserX } from 'lucide-react'
import { lecturerApi } from '../../services/api'
import { Page, Card, Button, Badge, Empty, Spinner } from '../../components/ui'
import toast from 'react-hot-toast'

export default function LecturerApprovals() {
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState({})

  const load = () => {
    setLoading(true)
    lecturerApi.pending()
      .then(r => setPending(r.data))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handle = async (id, action) => {
    setProcessing(p => ({ ...p, [id]: action }))
    try {
      if (action === 'approve') await lecturerApi.approve(id)
      else await lecturerApi.reject(id)
      toast.success(action === 'approve' ? 'Student approved and enrolled' : 'Registration rejected')
      setPending(p => p.filter(r => r.id !== id))
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally {
      setProcessing(p => ({ ...p, [id]: null }))
    }
  }

  return (
    <Page
      title="Pending Approvals"
      subtitle="Students awaiting registration approval"
    >
      {loading ? (
        <div className="flex justify-center py-20"><Spinner size={24} className="text-gray-300" /></div>
      ) : pending.length === 0 ? (
        <Empty icon={<Clock size={20} />} title="No pending approvals" description="All student registrations have been reviewed" />
      ) : (
        <div className="space-y-3">
          {pending.map((reg) => (
            <Card key={reg.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-amber-700 font-bold text-sm">
                      {reg.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{reg.full_name}</p>
                    <p className="text-xs text-gray-400">
                      {reg.student_number} · {reg.module_code} — {reg.module_name}
                    </p>
                    <p className="text-xs text-gray-300 mt-0.5">
                      Submitted {new Date(reg.submitted_at).toLocaleString('en-IE')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm" variant="secondary"
                    onClick={() => handle(reg.id, 'reject')}
                    loading={processing[reg.id] === 'reject'}
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <UserX size={13} /> Reject
                  </Button>
                  <Button
                    size="sm" variant="success"
                    onClick={() => handle(reg.id, 'approve')}
                    loading={processing[reg.id] === 'approve'}
                  >
                    <UserCheck size={13} /> Approve
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Page>
  )
}