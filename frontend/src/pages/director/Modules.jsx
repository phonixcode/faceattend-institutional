import { useEffect, useState } from 'react'
import { BookOpen } from 'lucide-react'
import { directorApi } from '../../services/api'
import { Page, Card, Empty, Spinner, Table, Pagination } from '../../components/ui'
import toast from 'react-hot-toast'

const PAGE_SIZE = 10

export default function DirectorModules() {
  const [modules, setModules] = useState([])
  const [total, setTotal]   = useState(0)
  const [page, setPage]     = useState(1)
  const [loading, setLoading] = useState(true)

  const load = (p = 1) => {
    setLoading(true)
    directorApi.modules({ page: p, page_size: PAGE_SIZE })
      .then(r => {
        setModules(r.data.items)
        setTotal(r.data.total)
        setPage(r.data.page)
      })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(1) }, [])

  const columns = [
    { key: 'module_code', label: 'Code',
      render: v => <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg">{v}</span> },
    { key: 'module_name', label: 'Module',
      render: v => <span className="font-semibold text-sm text-gray-800">{v}</span> },
    { key: 'semester', label: 'Semester', render: v => `Semester ${v}` },
    { key: 'academic_year', label: 'Year' },
  ]

  return (
    <Page title="Programme Modules" subtitle="All modules in your programme">
      <Card padding={false}>
        {loading
          ? <div className="flex justify-center py-16"><Spinner size={20} className="text-gray-300" /></div>
          : modules.length === 0
            ? <Empty icon={<BookOpen size={20} />} title="No modules found" />
            : <>
                <Table columns={columns} data={modules} />
                {total > PAGE_SIZE && (
                  <Pagination
                    page={page}
                    pageSize={PAGE_SIZE}
                    total={total}
                    onPageChange={(p) => load(p)}
                  />
                )}
              </>
        }
      </Card>
    </Page>
  )
}