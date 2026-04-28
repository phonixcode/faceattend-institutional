import { NavLink, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  LayoutDashboard, Users, BookOpen, GraduationCap,
  Building2, BarChart3, LogOut, Settings, ChevronLeft,
  Scan, Clock, FileText
} from 'lucide-react'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

const NAV = {
  SYSTEM_ADMIN: [
    { label: 'Dashboard',    icon: LayoutDashboard, to: '/admin/dashboard' },
    { label: 'Users',        icon: Users,           to: '/admin/users' },
    { label: 'Departments',  icon: Building2,       to: '/admin/departments' },
    { label: 'Programmes',   icon: GraduationCap,   to: '/admin/programmes' },
    { label: 'Modules',      icon: BookOpen,        to: '/admin/modules' },
    { label: 'Students',     icon: Users,           to: '/admin/students' },
    { label: 'Reports',      icon: BarChart3,       to: '/admin/reports' },
  ],
  LECTURER: [
    { label: 'Dashboard',    icon: LayoutDashboard, to: '/lecturer/dashboard' },
    { label: 'Modules',      icon: BookOpen,        to: '/lecturer/modules' },
    { label: 'Students',     icon: Users,           to: '/lecturer/students' },
    { label: 'Approvals',    icon: Clock,           to: '/lecturer/approvals' },
    { label: 'Reports',      icon: BarChart3,       to: '/lecturer/reports' },
  ],
  PROGRAMME_DIRECTOR: [
    { label: 'Dashboard',    icon: LayoutDashboard, to: '/director/dashboard' },
    { label: 'Modules',      icon: BookOpen,        to: '/director/modules' },
    { label: 'Reports',      icon: BarChart3,       to: '/director/reports' },
  ],
  STUDENT: [
    { label: 'Dashboard',    icon: LayoutDashboard, to: '/student/dashboard' },
    { label: 'My Attendance',icon: FileText,        to: '/student/attendance' },
    { label: 'Register Face',icon: Scan,            to: '/student/register-face' },
  ],
}

export default function Sidebar() {
  const { user, clearAuth } = useAuthStore()
  const navigate             = useNavigate()
  const items                = NAV[user?.role] || []
  const initials             = user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  const handleLogout = () => {
    clearAuth()
    toast.success('Signed out')
    navigate('/login')
  }

  return (
    <aside className="w-64 flex-shrink-0 h-screen sticky top-0 bg-white border-r border-gray-100 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gray-900 rounded-xl flex items-center justify-center">
            <GraduationCap size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">FaceAttend</p>
            <p className="text-xs text-gray-400">Institutional</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
              isActive
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            )}
          >
            <item.icon size={16} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-gray-100 space-y-0.5">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all duration-150"
        >
          <LogOut size={16} />
          Sign Out
        </button>

        <div className="flex items-center gap-3 px-3 py-2.5 mt-1">
          <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-700 truncate">{user?.full_name}</p>
            <p className="text-xs text-gray-400 truncate">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}