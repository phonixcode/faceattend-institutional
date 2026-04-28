import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Users, Clock, ArrowRight, CheckCircle } from 'lucide-react'
import { lecturerApi } from '../../services/api'
import { Page, StatCard, Card, Badge, Button, Empty, Spinner } from '../../components/ui'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

export default function LecturerDashboard() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate            = useNavigate()
  const { user }            = useAuthStore()

  useEffect(() => {
    lecturerApi.dashboard()
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-20"><Spinner size={24} className="text-gray-300" /></div>

  const first = user?.full_name?.split(' ')[0]

  return (
    <Page
      title={`Welcome back, ${first} 👋`}
      subtitle="Manage your modules, schedule lectures and track attendance"
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard icon={<BookOpen size={20} />} label="Your Modules"      value={data?.total_modules}      color="blue"  />
        <StatCard icon={<Users size={20} />}    label="Total Students"    value={data?.total_students}     color="green" />
        <StatCard icon={<Clock size={20} />}    label="Pending Approvals" value={data?.pending_approvals}  color="amber" />
      </div>

      {/* Pending approvals banner */}
      {data?.pending_approvals > 0 && (
        <div
          onClick={() => navigate('/lecturer/approvals')}
          className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 mb-6 cursor-pointer hover:bg-amber-100 transition"
        >
          <div className="flex items-center gap-3">
            <Clock size={16} className="text-amber-600" />
            <p className="text-sm font-semibold text-amber-800">
              {data.pending_approvals} student registration{data.pending_approvals > 1 ? 's' : ''} awaiting your approval
            </p>
          </div>
          <ArrowRight size={16} className="text-amber-500" />
        </div>
      )}

      {/* Module cards */}
      <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Your Modules</h2>

      {data?.modules?.length === 0 ? (
        <Empty icon={<BookOpen size={20} />} title="No modules assigned"
          description="Ask your system administrator to assign modules to your account"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.modules?.map((mod) => (
            <div
              key={mod.id}
              onClick={() => navigate(`/lecturer/modules/${mod.id}`)}
              className="card p-5 cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 active:scale-[.98]"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="inline-block px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg">
                  {mod.module_code}
                </span>
                <BookOpen size={15} className="text-gray-300" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm mb-1">{mod.module_name}</h3>
              <p className="text-xs text-gray-400">{mod.student_count} students enrolled</p>
              <div className="flex items-center gap-2 mt-4">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => { e.stopPropagation(); navigate(`/lecturer/modules/${mod.id}`) }}
                >
                  View Module
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Page>
  )
}