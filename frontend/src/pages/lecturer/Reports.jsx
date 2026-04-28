import { useEffect, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { lecturerApi } from '../../services/api'
import { Page, Spinner } from '../../components/ui'
import toast from 'react-hot-toast'

// Reuse the ModuleReport component pattern inline
export default function LecturerReports() {
  const [modules, setModules]   = useState([])
  const [selected, setSelected] = useState('')
  const [report, setReport]     = useState(null)
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    lecturerApi.modules()
      .then(r => { setModules(r.data); if (r.data.length > 0) setSelected(r.data[0].id) })
      .catch(() => toast.error('Failed to load modules'))
  }, [])

  useEffect(() => {
    if (!selected) return
    setLoading(true)
    lecturerApi.report(selected)
      .then(r => setReport(r.data))
      .catch(() => toast.error('Failed to load report'))
      .finally(() => setLoading(false))
  }, [selected])

  const handleExport = async () => {
    try {
      const res = await lecturerApi.exportReport(selected)
      const url = URL.createObjectURL(new Blob([res.data]))
      const a   = document.createElement('a'); a.href = url
      a.download = `${report?.module_code}_attendance.csv`; a.click()
      URL.revokeObjectURL(url)
      toast.success('Report exported')
    } catch { toast.error('Export failed') }
  }

  return (
    <Page
      title="Attendance Reports"
      subtitle="Per-student breakdown for each module"
      actions={
        report && (
          <button onClick={handleExport} className="btn btn-secondary btn-sm">
            Export CSV
          </button>
        )
      }
    >
      <div className="mb-6">
        <select
          className="input py-2 text-sm max-w-xs"
          value={selected}
          onChange={e => setSelected(e.target.value)}
        >
          {modules.map(m => (
            <option key={m.id} value={m.id}>{m.module_code} — {m.module_name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size={24} className="text-gray-300" /></div>
      ) : report ? (
        <div className="card overflow-hidden p-0">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div>
              <p className="text-sm font-bold text-gray-700">
                {report.total_students} students · {report.total_lectures} lectures
              </p>
              <p className="text-xs text-red-500 mt-0.5">
                {report.at_risk_count} students below 80% threshold
              </p>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Student','Attendance','Full','Partial','Absent','Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {report.students.map(s => (
                <tr key={s.student_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-gray-800 text-sm">{s.full_name}</p>
                    <p className="text-xs text-gray-400">{s.student_number}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${s.attendance_pct >= 80 ? 'bg-emerald-500' : s.attendance_pct >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${s.attendance_pct}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-700">{s.attendance_pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-gray-600">{s.grade_breakdown?.FULL || 0}</td>
                  <td className="px-4 py-3.5 text-gray-600">{s.grade_breakdown?.PARTIAL || 0}</td>
                  <td className="px-4 py-3.5 text-gray-600">{s.grade_breakdown?.ABSENT || 0}</td>
                  <td className="px-4 py-3.5">
                    <span className={`badge ${s.attendance_pct >= 80 ? 'badge-green' : s.attendance_pct >= 60 ? 'badge-amber' : 'badge-red'}`}>
                      {s.attendance_pct >= 80 ? 'Good' : s.attendance_pct >= 60 ? 'At Risk' : 'Critical'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </Page>
  )
}