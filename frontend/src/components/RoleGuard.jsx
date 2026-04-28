import { Navigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

const ROLE_HOME = {
  SYSTEM_ADMIN       : '/admin/dashboard',
  LECTURER           : '/lecturer/dashboard',
  PROGRAMME_DIRECTOR : '/director/dashboard',
  STUDENT            : '/student/dashboard',
}

export function RequireAuth({ children }) {
  const { token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  return children
}

export function RoleGuard({ roles, children }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) {
    return <Navigate to={ROLE_HOME[user.role] || '/login'} replace />
  }
  return children
}

export function RoleRedirect() {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={ROLE_HOME[user.role] || '/login'} replace />
}