import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import AppLayout from './components/layouts/AppLayout'
import { RequireAuth, RoleGuard, RoleRedirect } from './components/RoleGuard'

// Auth
import Login from './pages/Login'

// Admin
import AdminDashboard  from './pages/admin/Dashboard'
import AdminUsers      from './pages/admin/Users'
import AdminDepartments from './pages/admin/Departments'
import AdminProgrammes from './pages/admin/Programmes'
import AdminModules    from './pages/admin/Modules'
import AdminStudents   from './pages/admin/Students'
import AdminReports    from './pages/admin/Reports'

// Lecturer
import LecturerDashboard from './pages/lecturer/Dashboard'
import LecturerModules   from './pages/lecturer/Modules'
import LecturerModuleDetail from './pages/lecturer/ModuleDetail'
import LecturerStudents  from './pages/lecturer/Students'
import LecturerApprovals from './pages/lecturer/Approvals'
import LecturerReports   from './pages/lecturer/Reports'
import LectureLive       from './pages/lecturer/LectureLive'

// Director
import DirectorDashboard from './pages/director/Dashboard'
import DirectorModules   from './pages/director/Modules'
import DirectorReports   from './pages/director/Reports'

// Student
import StudentDashboard  from './pages/student/Dashboard'
import StudentAttendance from './pages/student/Attendance'
import StudentRegisterFace from './pages/student/RegisterFace'

// Public
import PublicRegister from './pages/public/Register'
import Kiosk          from './pages/kiosk/Kiosk'

const ADMIN    = ['SYSTEM_ADMIN']
const LECTURER = ['SYSTEM_ADMIN', 'LECTURER']
const DIRECTOR = ['SYSTEM_ADMIN', 'PROGRAMME_DIRECTOR']
const STUDENT  = ['STUDENT']

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: '12px',
            background  : '#111',
            color       : '#fff',
            fontSize    : '13px',
            fontWeight  : '500',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error  : { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />

      <Routes>
        {/* Public */}
        <Route path="/login"                    element={<Login />} />
        <Route path="/public/register/:moduleId" element={<PublicRegister />} />
        <Route path="/kiosk/:lectureId"          element={<Kiosk />} />
        <Route path="/"                          element={<RequireAuth><RoleRedirect /></RequireAuth>} />

        {/* Protected — with sidebar layout */}
        <Route element={<RequireAuth><AppLayout /></RequireAuth>}>

          {/* Admin */}
          <Route path="/admin/dashboard"    element={<RoleGuard roles={ADMIN}><AdminDashboard /></RoleGuard>} />
          <Route path="/admin/users"        element={<RoleGuard roles={ADMIN}><AdminUsers /></RoleGuard>} />
          <Route path="/admin/departments"  element={<RoleGuard roles={ADMIN}><AdminDepartments /></RoleGuard>} />
          <Route path="/admin/programmes"   element={<RoleGuard roles={ADMIN}><AdminProgrammes /></RoleGuard>} />
          <Route path="/admin/modules"      element={<RoleGuard roles={ADMIN}><AdminModules /></RoleGuard>} />
          <Route path="/admin/students"     element={<RoleGuard roles={ADMIN}><AdminStudents /></RoleGuard>} />
          <Route path="/admin/reports"      element={<RoleGuard roles={ADMIN}><AdminReports /></RoleGuard>} />

          {/* Lecturer */}
          <Route path="/lecturer/dashboard"        element={<RoleGuard roles={LECTURER}><LecturerDashboard /></RoleGuard>} />
          <Route path="/lecturer/modules"          element={<RoleGuard roles={LECTURER}><LecturerModules /></RoleGuard>} />
          <Route path="/lecturer/modules/:id"      element={<RoleGuard roles={LECTURER}><LecturerModuleDetail /></RoleGuard>} />
          <Route path="/lecturer/students"         element={<RoleGuard roles={LECTURER}><LecturerStudents /></RoleGuard>} />
          <Route path="/lecturer/approvals"        element={<RoleGuard roles={LECTURER}><LecturerApprovals /></RoleGuard>} />
          <Route path="/lecturer/reports"          element={<RoleGuard roles={LECTURER}><LecturerReports /></RoleGuard>} />
          <Route path="/lecturer/lecture/:lectureId/live" element={<RoleGuard roles={LECTURER}><LectureLive /></RoleGuard>} />

          {/* Director */}
          <Route path="/director/dashboard" element={<RoleGuard roles={DIRECTOR}><DirectorDashboard /></RoleGuard>} />
          <Route path="/director/modules"   element={<RoleGuard roles={DIRECTOR}><DirectorModules /></RoleGuard>} />
          <Route path="/director/reports"   element={<RoleGuard roles={DIRECTOR}><DirectorReports /></RoleGuard>} />

          {/* Student */}
          <Route path="/student/dashboard"     element={<RoleGuard roles={STUDENT}><StudentDashboard /></RoleGuard>} />
          <Route path="/student/attendance"    element={<RoleGuard roles={STUDENT}><StudentAttendance /></RoleGuard>} />
          <Route path="/student/register-face" element={<RoleGuard roles={STUDENT}><StudentRegisterFace /></RoleGuard>} />

        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}