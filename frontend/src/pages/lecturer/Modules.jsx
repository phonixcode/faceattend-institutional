import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, ChevronRight, Users } from 'lucide-react'
import { lecturerApi } from '../../services/api'
import { Page, Card, Empty, Spinner } from '../../components/ui'
import toast from 'react-hot-toast'

export default function LecturerModules() {
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate              = useNavigate()

  useEffect(() => {
    lecturerApi.modules()
      .then(r => setModules(r.data))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-20"><Spinner size={24} className="text-gray-300" /></div>

  return (
    <Page title="My Modules" subtitle="All modules assigned to you">
      {modules.length === 0 ? (
        <Empty icon={<BookOpen size={20} />} title="No modules assigned"
          description="Ask your admin to assign modules to your account" />
      ) : (
        <div className="space-y-3">
          {modules.map(mod => (
            <Card
              key={mod.id}
              className="cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 active:scale-[.99]"
              onClick={() => navigate(`/lecturer/modules/${mod.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <BookOpen size={17} className="text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-600">{mod.module_code}</span>
                      <span className="text-xs text-gray-400">· Semester {mod.semester}</span>
                    </div>
                    <p className="font-bold text-gray-900 text-sm">{mod.module_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <Users size={11} /> {mod.student_count || 0} students enrolled
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-300" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </Page>
  )
}