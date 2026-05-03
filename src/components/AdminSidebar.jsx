import { Link } from 'react-router-dom'
import Icon from './Icon'
import Text from './Text'
import Avatar from './Avatar'
import { formatRoleLabel } from '../constants/userRoleLabels'

function readCurrentUserFromStorage() {
  try {
    const raw = localStorage.getItem('currentUser')
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function AdminSidebar() {
  const currentUser = readCurrentUserFromStorage()
  const currentUserName = String(currentUser?.name || 'Admin User').trim()
  const roleLabel = formatRoleLabel(currentUser?.role)

  return (
    <aside className="group sticky top-0 flex h-[100dvh] max-h-[100dvh] w-20 shrink-0 flex-col self-start overflow-x-hidden overflow-y-auto border-r border-slate-200 bg-white transition-all duration-300 hover:z-10 hover:w-64 dark:border-primary/20 dark:bg-[#120a1a]">
      <div className="h-20 px-5 group-hover:px-6 flex items-center border-b border-slate-200 dark:border-primary/20 transition-all duration-300">
        <Link to="/" className="flex items-center gap-3 text-primary">
            <Icon name="movie_filter" className="text-3xl font-bold" />
          <div className="flex flex-col opacity-0 max-w-0 group-hover:opacity-100 group-hover:max-w-[180px] transition-all duration-300 whitespace-nowrap">
            <Text
              variant="h3"
              className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white"
            >
              CinemaStar
            </Text>
            <span className="text-xs text-slate-500 dark:text-slate-400">Management Panel</span>
          </div>
        </Link>
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
          <Avatar name={currentUserName} />
          <div className="flex-1 min-w-0 opacity-0 max-w-0 group-hover:opacity-100 group-hover:max-w-[140px] transition-all duration-300 overflow-hidden">
            <p className="text-sm font-semibold truncate">{currentUserName}</p>
            <p className="text-xs text-slate-500 truncate">{roleLabel}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default AdminSidebar

