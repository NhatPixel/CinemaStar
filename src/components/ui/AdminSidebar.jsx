import Icon from './Icon'
import Text from './Text'

function AdminSidebar() {
  return (
    <aside className="w-64 h-screen sticky top-0 bg-white dark:bg-[#120a1a] border-r border-slate-200 dark:border-primary/20 flex flex-col">
      <div className="h-20 px-6 flex items-center border-b border-slate-200 dark:border-primary/20">
        <div className="flex items-center gap-3 text-primary">
          <Icon name="movie_filter" className="text-3xl font-bold" />
          <div className="flex flex-col">
            <Text
              variant="h3"
              className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white"
            >
              CinemaStar
            </Text>
            <span className="text-xs text-slate-500 dark:text-slate-400">Admin Panel</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 text-sm">
        <a className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary/10 text-primary font-medium">
          <Icon name="movie" />
          <span>Quản lý phim</span>
        </a>
        <a className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-primary/10 transition-colors text-slate-600 dark:text-slate-300">
          <Icon name="event_seat" />
          <span>Suất chiếu</span>
        </a>
        <a className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-primary/10 transition-colors text-slate-600 dark:text-slate-300">
          <Icon name="theaters" />
          <span>Rạp chiếu</span>
        </a>
        <a className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-primary/10 transition-colors text-slate-600 dark:text-slate-300">
          <Icon name="group" />
          <span>Người dùng</span>
        </a>
        <a className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-primary/10 transition-colors text-slate-600 dark:text-slate-300">
          <Icon name="sell" />
          <span>Khuyến mãi</span>
        </a>
        <a className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-primary/10 transition-colors text-slate-600 dark:text-slate-300">
          <Icon name="bar_chart" />
          <span>Báo cáo</span>
        </a>
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-primary/20">
        <div className="flex items-center gap-3 p-2">
          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-primary/20 overflow-hidden">
            <Icon
              name="account_circle"
              className="w-full h-full flex items-center justify-center text-slate-500 dark:text-primary/70"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">Admin User</p>
            <p className="text-xs text-slate-500 truncate">Quản trị viên</p>
          </div>
          <button className="text-slate-400 hover:text-red-500 transition-colors">
            <Icon name="logout" className="text-xl" />
          </button>
        </div>
      </div>
    </aside>
  )
}

export default AdminSidebar

