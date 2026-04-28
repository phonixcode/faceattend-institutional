import { useEffect, useState } from 'react'
import { FileText } from 'lucide-react'
import { studentApi } from '../../services/api'
import { Page, Card, Badge, Empty, Spinner } from '../../components/ui'
import toast from 'react-hot-toast'

const GRADE_BADGE = {
  FULL        : 'green',
  PARTIAL     : 'blue',
  LEFT_EARLY  : 'amber',
  ARRIVED_LATE: 'amber',
  SUSPICIOUS  : 'red',
  ABSENT      : 'gray',
}

export default function StudentAttendance() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    studentApi.attendance()
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-20"><Spinner size={24} className="text-gray-300" /></div>

  return (
    <Page title="My Attendance" subtitle="Full lecture-by-lecture attendance history">
      {data?.history?.length === 0 ? (
        <Empty icon={<FileText size={20} />} title="No attendance records yet" />
      ) : (
        <Card padding={false}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Date','Module','Room','Scan 1','Scan 2','Scan 3','Grade'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.history.map((row) => (
                <tr key={row.lecture_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-gray-800 text-xs">{row.date}</p>
                    <p className="text-xs text-gray-400">{row.start_time?.slice(0,5)}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-xs text-gray-800">{row.module_code}</p>
                    <p className="text-xs text-gray-400 truncate max-w-32">{row.module_name}</p>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-gray-500">{row.room}</td>
                  <td className="px-4 py-3.5 text-center">{row.scan1 ? '✅' : '❌'}</td>
                  <td className="px-4 py-3.5 text-center">{row.scan2 ? '✅' : '❌'}</td>
                  <td className="px-4 py-3.5 text-center">{row.scan3 ? '✅' : '❌'}</td>
                  <td className="px-4 py-3.5">
                    <Badge variant={GRADE_BADGE[row.grade] || 'gray'}>
                      {row.grade.replace(/_/g,' ')}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </Page>
  )
}