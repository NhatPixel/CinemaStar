import { useState } from 'react'
import { AdminSidebar, Button, Icon, Text, Input, CustomSelect } from '../../components/ui'

const MANAGEMENT_STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'NOW_SHOWING', label: 'Đang chiếu' },
  { value: 'COMING_SOON', label: 'Sắp chiếu' },
  { value: 'STOP_SHOWING', label: 'Ngừng chiếu' },
]

function MovieManagement() {
  const [statusFilter, setStatusFilter] = useState('')

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value)
  }

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen flex text-slate-900 dark:text-slate-100">
      <AdminSidebar />

      {/* Main Content */}
      <main className="flex-1 min-w-0 p-6 md:p-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <Text variant="h1" className="text-3xl font-bold dark:text-slate-100">
              Quản lý phim
            </Text>
            <Text variant="small" className="text-slate-500 dark:text-slate-400 mt-1">
              Quản lý danh sách phim, trạng thái và thông tin chi tiết
            </Text>
          </div>
          <Button className="px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/30">
            <Icon name="add" />
            Tạo phim mới
          </Button>
        </header>

        {/* Filters */}
        <section className="bg-white dark:bg-primary/5 p-6 rounded-2xl border border-slate-200 dark:border-primary/20 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Input
                name="search"
                placeholder="Tìm kiếm tên phim, đạo diễn..."
                icon="search"
              />
            </div>
            <div>
              <CustomSelect
                name="statusFilter"
                value={statusFilter}
                onChange={handleStatusChange}
                options={MANAGEMENT_STATUS_OPTIONS}
                placeholder="Tất cả trạng thái"
              />
            </div>
          </div>
        </section>

        {/* Movie Table */}
        <div className="bg-white dark:bg-primary/5 rounded-2xl border border-slate-200 dark:border-primary/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-background-dark/30 border-b border-slate-200 dark:border-primary/20">
                  <th className="px-6 py-4 font-semibold text-sm">Poster</th>
                  <th className="px-6 py-4 font-semibold text-sm">Tên phim</th>
                  <th className="px-6 py-4 font-semibold text-sm">Đạo diễn</th>
                  <th className="px-6 py-4 font-semibold text-sm">Thời lượng</th>
                  <th className="px-6 py-4 font-semibold text-sm">Phát hành</th>
                  <th className="px-6 py-4 font-semibold text-sm">Quốc gia</th>
                  <th className="px-6 py-4 font-semibold text-sm">Trạng thái</th>
                  <th className="px-6 py-4 font-semibold text-sm text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-primary/10">
                {/* Row 1 */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-primary/5 transition-colors">
                  <td className="px-6 py-4">
                    <div
                      className="w-12 h-16 rounded-lg bg-slate-200 dark:bg-primary/20 bg-cover bg-center shadow-sm"
                      style={{ backgroundImage: "url('/assets/movie-sample.jpg')" }}
                    />
                  </td>
                  <td className="px-6 py-4 font-semibold">Avengers: Endgame</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">Anthony Russo</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">181 phút</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">26/04/2019</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">Mỹ</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-500 border border-green-500/20">
                      NOW_SHOWING
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                      >
                        <Icon name="visibility" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-all"
                      >
                        <Icon name="edit" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Icon name="delete" />
                      </Button>
                    </div>
                  </td>
                </tr>

                {/* Row 2 */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-primary/5 transition-colors">
                  <td className="px-6 py-4">
                    <div
                      className="w-12 h-16 rounded-lg bg-slate-200 dark:bg-primary/20 bg-cover bg-center shadow-sm"
                      style={{ backgroundImage: "url('/assets/movie-sample.jpg')" }}
                    />
                  </td>
                  <td className="px-6 py-4 font-semibold">Dune: Part Two</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">Denis Villeneuve</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">166 phút</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">01/03/2024</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">Mỹ</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                      COMING_SOON
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                      >
                        <Icon name="visibility" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-all"
                      >
                        <Icon name="edit" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Icon name="delete" />
                      </Button>
                    </div>
                  </td>
                </tr>

                {/* Row 3 */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-primary/5 transition-colors">
                  <td className="px-6 py-4">
                    <div
                      className="w-12 h-16 rounded-lg bg-slate-200 dark:bg-primary/20 bg-cover bg-center shadow-sm"
                      style={{ backgroundImage: "url('/assets/movie-sample.jpg')" }}
                    />
                  </td>
                  <td className="px-6 py-4 font-semibold">Lật Mặt 7</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">Lý Hải</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">138 phút</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">26/04/2024</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">Việt Nam</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-500 border border-slate-500/20">
                      STOP_SHOWING
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                      >
                        <Icon name="visibility" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-all"
                      >
                        <Icon name="edit" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Icon name="delete" />
                      </Button>
                    </div>
                  </td>
                </tr>

                {/* Row 4 */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-primary/5 transition-colors">
                  <td className="px-6 py-4">
                    <div
                      className="w-12 h-16 rounded-lg bg-slate-200 dark:bg-primary/20 bg-cover bg-center shadow-sm"
                      style={{ backgroundImage: "url('/assets/movie-sample.jpg')" }}
                    />
                  </td>
                  <td className="px-6 py-4 font-semibold">Mai</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">Trấn Thành</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">131 phút</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">10/02/2024</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">Việt Nam</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-500 border border-slate-500/20">
                      STOP_SHOWING
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                      >
                        <Icon name="visibility" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-all"
                      >
                        <Icon name="edit" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Icon name="delete" />
                      </Button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-background-dark/30 border-t border-slate-200 dark:border-primary/20 flex flex-col md:flex-row justify-between items-center gap-4">
            <Text variant="small" className="text-sm text-slate-500 dark:text-slate-400">
              Hiển thị 1 - 4 trong số 128 phim
            </Text>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 dark:border-primary/20 hover:bg-white dark:hover:bg-primary/20 transition-all"
              >
                <Icon name="chevron_left" />
              </Button>
              <Button className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary text-white font-bold">
                1
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 dark:border-primary/20 hover:bg-white dark:hover:bg-primary/20 transition-all font-medium"
              >
                2
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 dark:border-primary/20 hover:bg-white dark:hover:bg-primary/20 transition-all font-medium"
              >
                3
              </Button>
              <span className="px-2">...</span>
              <Button
                variant="ghost"
                size="sm"
                className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 dark:border-primary/20 hover:bg-white dark:hover:bg-primary/20 transition-all font-medium"
              >
                15
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 dark:border-primary/20 hover:bg-white dark:hover:bg-primary/20 transition-all"
              >
                <Icon name="chevron_right" />
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default MovieManagement

