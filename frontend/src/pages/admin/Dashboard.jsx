import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, BookOpen, GraduationCap, Building2,
  BarChart3, UserCheck, AlertTriangle, Scan
} from 'lucide-react'
import { adminApi } from '../../services/api'
import { Page, StatCard, Card, Badge, Spinner } from '../../components/ui'
import toast from 'react-hot-toast'

export default function AdminDashboard() {
  const [stats, setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate            = useNavigate()

  useEffect(() => {
    adminApi.dashboard()
      .then(r => setStats(r.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Spinner size={24} className="text-gray-400" />
    </div>
  )

  const roleColors = {
    LECTURER           : 'blue',
    PROGRAMME_DIRECTOR : 'red',
    MODULE_COORDINATOR : 'amber',
    SYSTEM_ADMIN       : 'gray',
  }

  return (
    <Page
      title="System Overview"
      subtitle="FaceAttend Institutional — admin control panel"
    >
      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<Users size={20} />}       label="Staff Users"   value={stats?.total_users}       color="blue"   />
        <StatCard icon={<GraduationCap size={20}/>} label="Students"      value={stats?.total_students}    color="green"  />
        <StatCard icon={<BookOpen size={20} />}     label="Modules"       value={stats?.total_modules}     color="amber"  />
        <StatCard icon={<Building2 size={20} />}    label="Departments"   value={stats?.total_departments} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users by role */}
        <Card>
          <h2 className="text-sm font-bold text-gray-700 mb-5">Staff by Role</h2>
          <div className="space-y-3">
            {stats?.users_by_role && Object.entries(stats.users_by_role)
              .filter(([role]) => role !== 'STUDENT')
              .map(([role, count]) => (
                <div key={role} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-gray-900" />
                    <span className="text-sm text-gray-600 capitalize">
                      {role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                    </span>
                  </div>
                  <Badge variant={roleColors[role] || 'gray'}>{count}</Badge>
                </div>
              ))}
          </div>
        </Card>

        {/* Quick actions */}
        <Card>
          <h2 className="text-sm font-bold text-gray-700 mb-5">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Add User',       icon: Users,        to: '/admin/users',       color: 'bg-blue-50 text-blue-600' },
              { label: 'Add Module',     icon: BookOpen,     to: '/admin/modules',     color: 'bg-amber-50 text-amber-600' },
              { label: 'Add Department', icon: Building2,    to: '/admin/departments', color: 'bg-purple-50 text-purple-600' },
              { label: 'View Reports',   icon: BarChart3,    to: '/admin/reports',     color: 'bg-green-50 text-green-600' },
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.to)}
                className="flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-all duration-150 active:scale-95"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${action.color}`}>
                  <action.icon size={18} />
                </div>
                <span className="text-xs font-semibold text-gray-600">{action.label}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </Page>
  )
}