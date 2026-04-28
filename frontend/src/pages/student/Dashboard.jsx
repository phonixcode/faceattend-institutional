import { useEffect, useState } from 'react'
import { CheckCircle, AlertTriangle, BookOpen } from 'lucide-react'
import { studentApi } from '../../services/api'
import { Page, StatCard, Card, Badge, Empty, Spinner } from '../../components/ui'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function StudentDashboard() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate            = useNavigate()

  useEffect(() => {
    studentApi.dashboard()
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-20"><Spinner size={24} className="text-gray-300" /></div>

  return (
    <Page
      title={`Hi, ${data?.full_name?.split(' ')[0]} 👋`}
      subtitle={`Student ${data?.student_number}`}
    >
      {!data?.face_registered && (
        <div
          onClick={() => navigate('/student/register-face')}
          className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 mb-6 cursor-pointer hover:bg-amber-100 transition"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle size={16} className="text-amber-600" />
            <p className="text-sm font-semibold text-amber-800">
              Your face has not been registered yet — click here to register
            </p>
          </div>
        </div>
      )}

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

      <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">My Modules</h2>

      {data?.modules?.length === 0 ? (
        <Empty icon={<BookOpen size={20} />} title="Not enrolled in any modules yet" />
      ) : (
        <div className="space-y-3">
          {data?.modules?.map((mod) => (
            <Card key={mod.module_id}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                      {mod.module_code}
                    </span>
                    {mod.at_risk && <Badge variant="red">At Risk</Badge>}
                  </div>
                  <p className="font-semibold text-gray-800 text-sm">{mod.module_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{mod.lectures_total} lectures</p>
                </div>
                <div className="text-right">
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