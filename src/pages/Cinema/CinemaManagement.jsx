import { useEffect, useMemo, useState } from 'react'
import { CustomSelect, Input, Text } from '../../components'

const CINEMA_ROWS = [
  {
    code: 'CIN001',
    name: 'Cinema A',
    address: 'HCM',
    status: 'ACTIVE',
  },
]

const CINEMA_STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'ACTIVE', label: 'Đang hoạt động' },
]

const STATUS_META = {
  ACTIVE: {
    label: 'Đang hoạt động',
    className: 'bg-green-500/10 text-green-500 border-green-500/20',
  },
}

function CinemaManagement() {
  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword.trim().toLowerCase()), 400)
    return () => clearTimeout(timer)
  }, [keyword])

  const rows = useMemo(() => {
    return CINEMA_ROWS.filter((cinema) => {
      const matchesKeyword =
        !debouncedKeyword ||
        String(cinema.code || '')
          .toLowerCase()
          .includes(debouncedKeyword) ||
        String(cinema.name || '')
          .toLowerCase()
          .includes(debouncedKeyword) ||
        String(cinema.address || '')
          .toLowerCase()
          .includes(debouncedKeyword)

      const matchesStatus = statusFilter === 'all' || cinema.status === statusFilter
      return matchesKeyword && matchesStatus
    })
  }, [debouncedKeyword, statusFilter])

  return (
    <main className="flex-1 min-w-0 p-6 md:p-8">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <Text variant="h1" className="text-3xl font-bold dark:text-slate-100">
                Quản lý rạp
              </Text>
              <Text variant="small" className="text-slate-500 dark:text-slate-400 mt-1">
                Quản lý danh sách rạp và trạng thái hoạt động
              </Text>
            </div>
          </header>

          <section className="bg-white dark:bg-primary/5 p-6 rounded-2xl border border-slate-200 dark:border-primary/20 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Input
                  name="cinemaSearch"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Tìm kiếm mã, tên hoặc địa chỉ rạp..."
                  icon="search"
                />
              </div>
              <div>
                <CustomSelect
                  name="statusFilter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={CINEMA_STATUS_OPTIONS}
                  placeholder="Tất cả trạng thái"
                />
              </div>
            </div>
          </section>

          <div className="bg-white dark:bg-primary/5 rounded-2xl border border-slate-200 dark:border-primary/20 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-background-dark/30 border-b border-slate-200 dark:border-primary/20">
                    <th className="px-6 py-4 font-semibold text-sm">Mã rạp</th>
                    <th className="px-6 py-4 font-semibold text-sm">Tên rạp</th>
                    <th className="px-6 py-4 font-semibold text-sm">Địa chỉ</th>
                    <th className="px-6 py-4 font-semibold text-sm">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-primary/10">
                  {rows.map((cinema) => {
                    const meta = STATUS_META[cinema.status] || {
                      label: cinema.status || '—',
                      className: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
                    }
                    return (
                      <tr
                        key={cinema.code}
                        className="hover:bg-slate-50/50 dark:hover:bg-primary/5 transition-colors"
                      >
                        <td className="px-6 py-4 font-semibold">{cinema.code || '—'}</td>
                        <td className="px-6 py-4">{cinema.name || '—'}</td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                          {cinema.address || '—'}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold border ${meta.className}`}
                          >
                            {meta.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-background-dark/30 border-t border-slate-200 dark:border-primary/20">
              {rows.length === 0 ? (
                <Text variant="small" className="text-sm text-slate-500 dark:text-slate-400">
                  Không có rạp phù hợp.
                </Text>
              ) : (
                <Text variant="small" className="text-sm text-slate-500 dark:text-slate-400">
                  Đang hiển thị {rows.length} rạp
                </Text>
              )}
            </div>
          </div>
    </main>
  )
}

export default CinemaManagement
