import { useEffect, useState } from 'react'
import { BarChart3, Users, BookOpen, AlertTriangle, Scan } from 'lucide-react'
import { adminApi } from '../../services/api'
import { Page, StatCard, Card, Spinner } from '../../components/ui'
import toast from 'react-hot-toast'

export default function AdminReports() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.reports()
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load reports'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-20"><Spinner size={24} className="text-gray-300" /></div>

  return (
    <Page title="System Reports" subtitle="Platform-wide attendance and usage overview">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard icon={<Scan size={20} />}        label="Attendance Records"   value={data?.total_attendance_records} color="blue"   />
        <StatCard icon={<BookOpen size={20} />}    label="Lectures Scheduled"   value={data?.total_lectures_scheduled} color="green"  />
        <StatCard icon={<AlertTriangle size={20}/>} label="Needs Review"        value={data?.records_needing_review}   color="amber"  />
        <StatCard icon={<BookOpen size={20} />}    label="Active Modules"       value={data?.modules_active}           color="purple" />
        <StatCard icon={<Users size={20} />}       label="Students with Face"   value={data?.students_with_face}       color="green"  />
      </div>

      <Card>
        <h2 className="text-sm font-bold text-gray-700 mb-4">About the Data</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          This overview shows system-wide statistics. For module-level reports with per-student
          attendance breakdowns, grades, and CSV exports, visit the Lecturer portal and open
          any module's report page. Programme Directors can view aggregated reports across
          their programme from the Director portal.
        </p>
      </Card>
    </Page>
  )
}