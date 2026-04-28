import { useEffect, useState } from 'react'
import { BookOpen, Users, BarChart3 } from 'lucide-react'
import { directorApi } from '../../services/api'
import { Page, StatCard, Card, Spinner, Empty } from '../../components/ui'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function DirectorDashboard() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate            = useNavigate()

  useEffect(() => {
    directorApi.dashboard()
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-20"><Spinner size={24} className="text-gray-300" /></div>

  return (
    <Page
      title={data?.programme_name || 'Programme Dashboard'}
      subtitle="Programme-wide attendance and module overview"
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard icon={<BookOpen size={20} />} label="Modules"   value={data?.total_modules}   color="blue"  />
        <StatCard icon={<Users size={20} />}    label="Students"  value={data?.total_students}  color="green" />
        <StatCard icon={<BarChart3 size={20} />} label="Lectures" value={data?.total_lectures}  color="purple"/>
      </div>

      <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Modules</h2>
      {data?.modules?.length === 0 ? (
        <Empty icon={<BookOpen size={20} />} title="No modules in this programme" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.modules?.map(mod => (
            <div key={mod.id} className="card p-5">
              <span className="inline-block px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg mb-3">
                {mod.module_code}
              </span>
              <p className="font-bold text-gray-900 text-sm mb-1">{mod.module_name}</p>
              <p className="text-xs text-gray-400">{mod.student_count} students</p>
            </div>
          ))}
        </div>
      )}
    </Page>
  )
}