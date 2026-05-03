import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { logout, clearStoredAuth } from '../api/auth'
import { Icon, Text, Button, Avatar, useToast } from '.'

function readCurrentUserFromStorage() {
  try {
    const raw = localStorage.getItem('currentUser')
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function readRolesFromStorage() {
  const user = readCurrentUserFromStorage()
  const roleValue = user?.role
  if (Array.isArray(roleValue)) {
    return roleValue.map((r) => String(r).trim().toUpperCase()).filter(Boolean)
  }
  if (!roleValue) return []
  return String(roleValue)
    .split(/[,\s]+/)
    .map((r) => r.trim().toUpperCase())
    .filter(Boolean)
}

function AppHeader({ showLoginButton = true }) {
  const toast = useToast()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)
  const currentUser = readCurrentUserFromStorage()
  const hasCurrentUser = Boolean(currentUser)
  const shouldShowLoginButton = showLoginButton && !hasCurrentUser
  const currentUserName = String(currentUser?.name || '').trim()
  const roles = readRolesFromStorage()
  const canAccessManagement = roles.includes('ADMIN') || roles.includes('MANAGER')

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
    <header className="sticky top-0 z-50 border-b border-primary/20 bg-background-light dark:bg-background-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-12">
            <a className="flex items-center gap-3 text-primary" href="/">
              <Icon name="movie_filter" className="text-4xl font-bold" />
              <Text
                variant="h2"
                className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white"
              >
                CinemaStar
              </Text>
            </a>
            <nav className="hidden md:flex items-center gap-8">
              <a className="text-sm font-semibold hover:text-primary transition-colors" href="/movies">
                Phim
              </a>
              {canAccessManagement ? (
                <Link className="text-sm font-semibold hover:text-primary transition-colors" to="/management">
                  Quản lý
                </Link>
              ) : null}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {shouldShowLoginButton ? (
              <Link to="/login">
                <Button
                  variant="primary"
                  size="sm"
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-full"
                >
                  <Icon name="login" className="text-lg" />
                  <span className="text-sm font-semibold">Đăng nhập</span>
                </Button>
              </Link>
            ) : null}

            {hasCurrentUser ? (
              <>
                <Avatar name={currentUserName} />
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center justify-center p-1 bg-transparent border-none shadow-none hover:bg-transparent"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  title={loggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
                >
                  <Icon name="logout" className="text-lg" />
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}

export default AppHeader

