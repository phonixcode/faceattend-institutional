import { useEffect, useState } from 'react'
import { Users, Search, CheckCircle } from 'lucide-react'
import { lecturerApi } from '../../services/api'
import { Page, Card, Badge, Empty, Spinner, Pagination } from '../../components/ui'
import toast from 'react-hot-toast'

const PAGE_SIZE = 10

export default function LecturerStudents() {
  const [modules, setModules]   = useState([])
  const [selected, setSelected] = useState('')
  const [students, setStudents] = useState([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [loading, setLoading]   = useState(false)
  const [search, setSearch]     = useState('')

  useEffect(() => {
    lecturerApi.modules()
      .then(r => { setModules(r.data); if (r.data.length > 0) setSelected(r.data[0].id) })
      .catch(() => toast.error('Failed to load modules'))
  }, [])

  const loadStudents = (p = 1) => {
    if (!selected) return
    setLoading(true)
    lecturerApi.students(selected, { page: p, page_size: PAGE_SIZE })
      .then(r => {
        setStudents(r.data.items)
        setTotal(r.data.total)
        setPage(r.data.page)
      })
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!selected) return
    loadStudents(1)
  }, [selected])

  const filtered = students.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.student_number.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Page title="Students" subtitle="Students enrolled in your modules">
      <div className="flex items-center gap-3 mb-6">
        <select
          className="input py-2 text-sm max-w-xs"
          value={selected}
          onChange={e => setSelected(e.target.value)}
        >
          {modules.map(m => (
            <option key={m.id} value={m.id}>{m.module_code} — {m.module_name}</option>
          ))}
        </select>
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9 py-2 text-sm"
            placeholder="Search students..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card padding={false}>
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size={20} className="text-gray-300" /></div>
        ) : filtered.length === 0 ? (
          <Empty icon={<Users size={20} />} title="No students found" />
        ) : (
          <>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Student','Email','Year','Face','Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-gray-800 text-sm">{s.full_name}</p>
                    <p className="text-xs text-gray-400">{s.student_number}</p>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-gray-500">{s.email}</td>
                  <td className="px-4 py-3.5 text-gray-600">Year {s.year_of_study}</td>
                  <td className="px-4 py-3.5">
                    {s.face_registered
                      ? <Badge variant="green"><CheckCircle size={11}/> Registered</Badge>
                      : <Badge variant="amber">Pending</Badge>
                    }
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge variant={s.is_active ? 'green' : 'red'}>{s.is_active ? 'Active' : 'Inactive'}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {total > PAGE_SIZE && (
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={(p) => loadStudents(p)}
            />
          )}
          </>
        )}
      </Card>
    </Page>
  )
}