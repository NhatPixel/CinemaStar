import { Link } from 'react-router-dom'
import Icon from './Icon'
import Text from './Text'

function AdminSidebar() {
  return (
    <aside className="group w-20 hover:w-64 h-screen sticky top-0 bg-white dark:bg-[#120a1a] border-r border-slate-200 dark:border-primary/20 flex flex-col overflow-hidden transition-all duration-300">
      <div className="h-20 px-5 group-hover:px-6 flex items-center border-b border-slate-200 dark:border-primary/20 transition-all duration-300">
        <div className="flex items-center gap-3 text-primary">
          <Icon name="movie_filter" className="text-3xl font-bold" />
          <div className="flex flex-col opacity-0 max-w-0 group-hover:opacity-100 group-hover:max-w-[180px] transition-all duration-300 whitespace-nowrap">
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

      <nav className="flex-1 px-3 group-hover:px-4 py-4 space-y-1 text-sm transition-all duration-300">
        <Link
          to="/management/movies"
          className="flex items-center justify-center group-hover:justify-start gap-3 px-3 group-hover:px-4 py-3 rounded-lg bg-primary/10 text-primary font-medium transition-all duration-300"
        >
          <Icon name="movie" />
          <span className="opacity-0 max-w-0 group-hover:opacity-100 group-hover:max-w-[140px] transition-all duration-300 whitespace-nowrap overflow-hidden">
            Quản lý phim
          </span>
        </Link>
      </nav>

      <div className="p-3 group-hover:p-4 border-t border-slate-200 dark:border-primary/20 transition-all duration-300">
        <div className="flex items-center justify-center group-hover:justify-start gap-3 p-2 transition-all duration-300">
          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-primary/20 overflow-hidden">
            <Icon
              name="account_circle"
              className="w-full h-full flex items-center justify-center text-slate-500 dark:text-primary/70"
            />
          </div>
          <div className="flex-1 min-w-0 opacity-0 max-w-0 group-hover:opacity-100 group-hover:max-w-[140px] transition-all duration-300 overflow-hidden">
            <p className="text-sm font-semibold truncate">Admin User</p>
            <p className="text-xs text-slate-500 truncate">Quản trị viên</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default AdminSidebar

