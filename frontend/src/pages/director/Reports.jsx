import { useEffect, useState } from 'react'
import { BarChart3, AlertTriangle } from 'lucide-react'
import { directorApi } from '../../services/api'
import { Page, Card, Badge, Spinner, Empty } from '../../components/ui'
import toast from 'react-hot-toast'

export default function DirectorReports() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    directorApi.reports()
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-20"><Spinner size={24} className="text-gray-300" /></div>

  return (
    <Page title="Programme Reports" subtitle={data?.programme_name}>
      {data?.modules?.length === 0 ? (
        <Empty icon={<BarChart3 size={20} />} title="No data yet" />
      ) : (
        <Card padding={false}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Module', 'Students', 'Lectures', 'Records'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.modules.map(m => (
                <tr key={m.module_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-gray-800 text-sm">{m.module_name}</p>
                    <p className="text-xs text-blue-600 font-bold">{m.module_code}</p>
                  </td>
                  <td className="px-4 py-3.5 text-gray-600">{m.total_enrolled}</td>
                  <td className="px-4 py-3.5 text-gray-600">{m.total_lectures}</td>
                  <td className="px-4 py-3.5 text-gray-600">{m.total_records}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </Page>
  )
}