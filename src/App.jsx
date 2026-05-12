import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import { ToastProvider } from './components'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import VerifyOtp from './pages/Auth/VerifyOtp'
import ForgotPassword from './pages/Auth/ForgotPassword'
import MovieList from './pages/Movie/MovieList'
import MovieDetail from './pages/Movie/MovieDetail'
import MovieManagement from './pages/Movie/MovieManagement'
import MovieCreate from './pages/Movie/MovieCreate'
import MovieEdit from './pages/Movie/MovieEdit'
import CinemaManagement from './pages/Cinema/CinemaManagement'
import ManagementLayout from './components/layout/ManagementLayout'
import UserProfile from './pages/User/UserProfile'

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
          <Route path="movies/new" element={<MovieCreate />} />
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
