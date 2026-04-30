import { useEffect, useState } from 'react'
import { CheckCircle, AlertTriangle, BookOpen, GraduationCap, Building2, User, Calendar } from 'lucide-react'
import { studentApi } from '../../services/api'
import { Page, StatCard, Card, Badge, Empty, Spinner } from '../../components/ui'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function StudentDashboard() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate              = useNavigate()

  useEffect(() => {
    studentApi.dashboard()
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex justify-center py-20">
      <Spinner size={24} className="text-gray-300" />
    </div>
  )

  return (
    <Page
      title={`Hi, ${data?.full_name?.split(' ')[0]} 👋`}
      subtitle={`Student · ${data?.student_number}`}
    >
      {/* Face not registered banner */}
      {!data?.face_registered && (
        <div
          onClick={() => navigate('/student/register-face')}
          className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 mb-6 cursor-pointer hover:bg-amber-100 transition"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle size={16} className="text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Face not registered yet</p>
              <p className="text-xs text-amber-600 mt-0.5">Tap here to register — required for attendance scans</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
            Register →
          </span>
        </div>
      )}

      {/* Profile info card */}
      <Card className="mb-6">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <ProfileItem
            icon={<GraduationCap size={14} />}
            label="Programme"
            value={data?.programme_name}
          />
          <ProfileItem
            icon={<Building2 size={14} />}
            label="Department"
            value={data?.department_name}
          />
          <ProfileItem
            icon={<User size={14} />}
            label="Programme Director"
            value={data?.director_name}
          />
          <ProfileItem
            icon={<Calendar size={14} />}
            label="Admission Year"
            value={data?.admission_year ? `${data.admission_year} intake · Year ${data?.year_of_study}` : null}
          />
        </div>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard
          icon={<CheckCircle size={20} />}
          label="Overall Attendance"
          value={`${data?.overall_pct || 0}%`}
          color={data?.overall_pct >= 80 ? 'green' : 'amber'}
        />
        <StatCard
          icon={<BookOpen size={20} />}
          label="Enrolled Modules"
          value={data?.modules?.length || 0}
          color="blue"
        />
      </div>

      {/* Modules */}
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">My Modules</h2>

      {data?.modules?.length === 0 ? (
        <Empty icon={<BookOpen size={20} />} title="Not enrolled in any modules yet" />
      ) : (
        <div className="space-y-3">
          {data?.modules?.map((mod) => (
            <Card key={mod.module_id}>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                      {mod.module_code}
                    </span>
                    {mod.at_risk && <Badge variant="red">At Risk</Badge>}
                  </div>
                  <p className="font-semibold text-gray-800 text-sm truncate">{mod.module_name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    {mod.lecturer_name && (
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <User size={10} /> {mod.lecturer_name}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">{mod.lectures_total} lectures</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-2xl font-bold ${
                    mod.attendance_pct >= 80 ? 'text-emerald-600' :
                    mod.attendance_pct >= 60 ? 'text-amber-600'   : 'text-red-600'
                  }`}>
                    {mod.attendance_pct}%
                  </p>
                  <div className="w-20 bg-gray-100 rounded-full h-1.5 mt-1">
                    <div
                      className={`h-1.5 rounded-full ${
                        mod.attendance_pct >= 80 ? 'bg-emerald-500' :
                        mod.attendance_pct >= 60 ? 'bg-amber-500'   : 'bg-red-500'
                      }`}
                      style={{ width: `${mod.attendance_pct}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Page>
  )
}

function ProfileItem({ icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-6 h-6 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-800 truncate">{value || '—'}</p>
      </div>
    </div>
  )
}
