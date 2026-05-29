import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { logout, clearStoredAuth } from '../../api/auth'
import Button from '../Button'
import Icon from '../Icon'
import Text from '../Text'
import Avatar from '../user/Avatar'
import { useToast } from '../useToast'
import { formatRoleLabel, readCurrentUserRole } from '../../constants/userRoleLabels'

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
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [loggingOut, setLoggingOut] = useState(false)
  const currentUser = readCurrentUserFromStorage()
  const currentUserName = String(currentUser?.name || 'Admin User').trim()
  const role = readCurrentUserRole()
  const isAdmin = role === 'ADMIN'
  const isManager = role === 'MANAGER'
  const roleLabel = formatRoleLabel(currentUser?.role)
  const isMoviesActive = location.pathname.startsWith('/management/movies')
  const isCinemasActive = location.pathname.startsWith('/management/cinemas')
  const isHallsActive = location.pathname.startsWith('/management/halls')
  const isShowtimesActive = location.pathname.startsWith('/management/showtimes')
  const isPricingPoliciesActive = location.pathname.startsWith('/management/pricing-policies')
  const isBookingsActive = location.pathname.startsWith('/management/bookings')
  const isProductsActive = location.pathname.startsWith('/management/products')
  const isUsersActive = location.pathname.startsWith('/management/users')

  const handleLogout = async () => {
    if (loggingOut) return
    try {
      setLoggingOut(true)
      await logout()
      clearStoredAuth()
      toast.success('Đăng xuất thành công')
      navigate('/login')
    } catch (err) {
      toast.error(err?.message || 'Không thể đăng xuất')
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <aside className="group sticky top-0 flex h-[100dvh] max-h-[100dvh] w-20 shrink-0 flex-col self-start overflow-x-hidden overflow-y-auto border-r border-slate-200 bg-white transition-all duration-300 hover:z-10 hover:w-64 dark:border-primary/20 dark:bg-[#120a1a]">
      <div className="h-20 px-5 group-hover:px-6 flex items-center border-b border-slate-200 dark:border-primary/20 transition-all duration-300">
        <Link to="/" className="flex items-center justify-center group-hover:justify-start gap-0 group-hover:gap-3 text-primary w-full">
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
        {isAdmin ? (
          <Link
            to="/management/movies"
            className={`flex items-center justify-center group-hover:justify-start gap-0 group-hover:gap-3 px-3 group-hover:px-4 py-3 rounded-lg transition-all duration-300 ${
              isMoviesActive
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-slate-600 hover:bg-primary/5 hover:text-primary dark:text-slate-300'
            }`}
          >
            <Icon name="movie" />
            <span className="opacity-0 max-w-0 group-hover:opacity-100 group-hover:max-w-[140px] transition-all duration-300 whitespace-nowrap overflow-hidden">
              Quản lý phim
            </span>
          </Link>
        ) : null}
        {isAdmin || isManager ? (
          <Link
            to="/management/users"
            className={`flex items-center justify-center group-hover:justify-start gap-0 group-hover:gap-3 px-3 group-hover:px-4 py-3 rounded-lg transition-all duration-300 ${
              isUsersActive
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-slate-600 hover:bg-primary/5 hover:text-primary dark:text-slate-300'
            }`}
          >
            <Icon name="group" />
            <span className="opacity-0 max-w-0 group-hover:opacity-100 group-hover:max-w-[140px] transition-all duration-300 whitespace-nowrap overflow-hidden">
              Quản lý người dùng
            </span>
          </Link>
        ) : null}
        {isAdmin ? (
          <Link
            to="/management/cinemas"
            className={`flex items-center justify-center group-hover:justify-start gap-0 group-hover:gap-3 px-3 group-hover:px-4 py-3 rounded-lg transition-all duration-300 ${
              isCinemasActive
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-slate-600 hover:bg-primary/5 hover:text-primary dark:text-slate-300'
            }`}
          >
            <Icon name="festival" />
            <span className="opacity-0 max-w-0 group-hover:opacity-100 group-hover:max-w-[140px] transition-all duration-300 whitespace-nowrap overflow-hidden">
              Quản lý rạp
            </span>
          </Link>
        ) : null}
        {isManager ? (
          <Link
            to="/management/halls"
            className={`flex items-center justify-center group-hover:justify-start gap-0 group-hover:gap-3 px-3 group-hover:px-4 py-3 rounded-lg transition-all duration-300 ${
              isHallsActive
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-slate-600 hover:bg-primary/5 hover:text-primary dark:text-slate-300'
            }`}
          >
            <Icon name="meeting_room" />
            <span className="opacity-0 max-w-0 group-hover:opacity-100 group-hover:max-w-[140px] transition-all duration-300 whitespace-nowrap overflow-hidden">
              Quản lý phòng chiếu
            </span>
          </Link>
        ) : null}
        {isManager ? (
          <Link
            to="/management/pricing-policies"
            className={`flex items-center justify-center group-hover:justify-start gap-0 group-hover:gap-3 px-3 group-hover:px-4 py-3 rounded-lg transition-all duration-300 ${
              isPricingPoliciesActive
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-slate-600 hover:bg-primary/5 hover:text-primary dark:text-slate-300'
            }`}
          >
            <Icon name="payments" />
            <span className="opacity-0 max-w-0 group-hover:opacity-100 group-hover:max-w-[140px] transition-all duration-300 whitespace-nowrap overflow-hidden">
              Chính sách giá
            </span>
          </Link>
        ) : null}
        {isManager ? (
          <Link
            to="/management/showtimes"
            className={`flex items-center justify-center group-hover:justify-start gap-0 group-hover:gap-3 px-3 group-hover:px-4 py-3 rounded-lg transition-all duration-300 ${
              isShowtimesActive
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-slate-600 hover:bg-primary/5 hover:text-primary dark:text-slate-300'
            }`}
          >
            <Icon name="event_available" />
            <span className="opacity-0 max-w-0 group-hover:opacity-100 group-hover:max-w-[140px] transition-all duration-300 whitespace-nowrap overflow-hidden">
              Quản lý suất chiếu
            </span>
          </Link>
        ) : null}
        {isManager ? (
          <Link
            to="/management/bookings"
            className={`flex items-center justify-center group-hover:justify-start gap-0 group-hover:gap-3 px-3 group-hover:px-4 py-3 rounded-lg transition-all duration-300 ${
              isBookingsActive
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-slate-600 hover:bg-primary/5 hover:text-primary dark:text-slate-300'
            }`}
          >
            <Icon name="receipt_long" />
            <span className="opacity-0 max-w-0 group-hover:opacity-100 group-hover:max-w-[140px] transition-all duration-300 whitespace-nowrap overflow-hidden">
              Quản lý đơn đặt vé
            </span>
          </Link>
        ) : null}
        {isManager ? (
          <Link
            to="/management/products"
            className={`flex items-center justify-center group-hover:justify-start gap-0 group-hover:gap-3 px-3 group-hover:px-4 py-3 rounded-lg transition-all duration-300 ${
              isProductsActive
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-slate-600 hover:bg-primary/5 hover:text-primary dark:text-slate-300'
            }`}
          >
            <Icon name="fastfood" />
            <span className="opacity-0 max-w-0 group-hover:opacity-100 group-hover:max-w-[140px] transition-all duration-300 whitespace-nowrap overflow-hidden">
              Quản lý sản phẩm
            </span>
          </Link>
        ) : null}
      </nav>

      <div className="p-3 group-hover:p-4 border-t border-slate-200 dark:border-primary/20 transition-all duration-300">
        <div className="flex items-center justify-center group-hover:justify-start gap-0 group-hover:gap-2 p-2 transition-all duration-300">
          <Avatar name={currentUserName} />
          <div className="flex-1 min-w-0 opacity-0 max-w-0 group-hover:opacity-100 group-hover:max-w-[100px] transition-all duration-300 overflow-hidden">
            <p className="text-sm font-semibold truncate">{currentUserName}</p>
            <p className="text-xs text-slate-500 truncate">{roleLabel}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="hidden shrink-0 group-hover:inline-flex items-center justify-center p-1 bg-transparent border-none shadow-none hover:bg-slate-100 dark:hover:bg-primary/10 transition-all duration-300"
            onClick={handleLogout}
            disabled={loggingOut}
            title={loggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
          >
            <Icon name="logout" className="text-lg" />
          </Button>
        </div>
      </div>
    </aside>
  )
}

export default AdminSidebar
