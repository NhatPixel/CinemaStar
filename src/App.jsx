import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import { ToastProvider } from './components'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import VerifyOtp from './pages/auth/VerifyOtp'
import ForgotPassword from './pages/auth/ForgotPassword'
import MovieList from './pages/movie/MovieList'
import MovieDetail from './pages/movie/MovieDetail'
import MovieManagement from './pages/movie/MovieManagement'
import MovieCreate from './pages/movie/MovieCreate'
import MovieEdit from './pages/movie/MovieEdit'
import CinemaManagement from './pages/cinema/CinemaManagement'
import ManagementLayout from './components/layout/ManagementLayout'
import UserProfile from './pages/user/UserProfile'

function resolveManagementRedirectPath() {
  try {
    const raw = localStorage.getItem('currentUser')
    if (!raw) return '/'
    const user = JSON.parse(raw)
    const role = String(user?.role || '').trim().toUpperCase()
    if (role === 'ADMIN') return '/management/movies'
    if (role === 'MANAGER') return '/'
    return '/'
  } catch {
    return '/'
  }
}

function resolveRootRedirectPath() {
  const hasCurrentUser = Boolean(localStorage.getItem('currentUser'))
  return hasCurrentUser ? '/movies' : '/login'
}

function App() {
  const managementPath = resolveManagementRedirectPath()
  const rootPath = resolveRootRedirectPath()

  return (
    <ToastProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/movies" element={<MovieList />} />
        <Route path="/movies/:id" element={<MovieDetail />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="/management" element={<ManagementLayout />}>
          <Route index element={<Navigate to={managementPath} replace />} />
          <Route path="movies" element={<MovieManagement />} />
          <Route path="movies/create" element={<MovieCreate />} />
          <Route path="movies/:id/edit" element={<MovieEdit />} />
          <Route path="cinemas" element={<CinemaManagement />} />
        </Route>
        <Route path="/" element={<Navigate to={rootPath} replace />} />
      </Routes>
    </BrowserRouter>
    </ToastProvider>
  )
}

export default App
