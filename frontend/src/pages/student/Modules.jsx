import { useEffect, useState } from 'react'
import { BookOpen, Calendar, Clock, MapPin, ChevronDown, ChevronUp, User } from 'lucide-react'
import { studentApi } from '../../services/api'
import { Page, Card, Badge, Empty, Spinner } from '../../components/ui'
import toast from 'react-hot-toast'

export default function StudentModules() {
  const [modules, setModules]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState({})

  useEffect(() => {
    studentApi.modules()
      .then(r => {
        setModules(r.data)
        // auto-expand all by default
        const init = {}
        r.data.forEach(m => { init[m.module_id] = true })
        setExpanded(init)
      })
      .catch(() => toast.error('Failed to load modules'))
      .finally(() => setLoading(false))
  }, [])

  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  if (loading) return <div className="flex justify-center py-20"><Spinner size={24} className="text-gray-300" /></div>

  return (
    <Page title="My Modules" subtitle="All enrolled modules and lecture timetables">
      {modules.length === 0 ? (
        <Empty icon={<BookOpen size={20} />} title="No modules enrolled yet" />
      ) : (
        <div className="space-y-4">
          {modules.map(mod => {
            const upcoming = mod.lectures.filter(l => l.is_future)
            const past     = mod.lectures.filter(l => !l.is_future)
            const isOpen   = expanded[mod.module_id]

            return (
              <Card key={mod.module_id} padding={false}>
                {/* Module header */}
                <button
                  className="w-full flex items-center justify-between p-5 text-left"
                  onClick={() => toggle(mod.module_id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                      <BookOpen size={18} className="text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                          {mod.module_code}
                        </span>
                        <span className="text-xs text-gray-400">Sem {mod.semester} · {mod.academic_year}</span>
                      </div>
                      <p className="font-bold text-gray-900 text-sm">{mod.module_name}</p>
                      {mod.lecturer_name && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <User size={10} /> {mod.lecturer_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {upcoming.length > 0 && (
                      <Badge variant="green">{upcoming.length} upcoming</Badge>
                    )}
                    <span className="text-xs text-gray-400">{mod.lectures.length} lectures</span>
                    {isOpen
                      ? <ChevronUp size={16} className="text-gray-400" />
                      : <ChevronDown size={16} className="text-gray-400" />
                    }
                  </div>
                </button>

                {/* Lecture list */}
                {isOpen && (
                  <div className="border-t border-gray-100">
                    {mod.lectures.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-6">No lectures scheduled</p>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {mod.lectures.map(lec => (
                          <div
                            key={lec.id}
                            className={`flex items-center gap-4 px-5 py-3.5 ${
                              lec.is_future ? 'bg-blue-50/40' : ''
                            }`}
                          >
                            {/* Date pill */}
                            <div className={`w-12 flex-shrink-0 text-center rounded-xl py-1.5 ${
                              lec.is_future ? 'bg-blue-100' : 'bg-gray-100'
                            }`}>
                              <p className={`text-xs font-bold ${lec.is_future ? 'text-blue-700' : 'text-gray-600'}`}>
                                {new Date(lec.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                              </p>
                              <p className="text-xs text-gray-400">
                                {new Date(lec.date).toLocaleDateString('en-GB', { weekday: 'short' })}
                              </p>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="flex items-center gap-1 text-xs text-gray-600">
                                  <Clock size={11} className="text-gray-400" />
                                  {lec.start_time.slice(0, 5)} – {lec.end_time.slice(0, 5)}
                                </span>
                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                  <MapPin size={11} className="text-gray-400" />
                                  {lec.room}
                                </span>
                              </div>
                            </div>

                            {lec.is_future
                              ? <Badge variant="blue">Upcoming</Badge>
                              : <Badge variant="gray">Past</Badge>
                            }
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </Page>
  )
}
