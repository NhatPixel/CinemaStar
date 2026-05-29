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
import HallManagement from './pages/hall/HallManagement'
import ShowtimeManagement from './pages/showtime/ShowtimeManagement'
import ShowtimeSelection from './pages/booking/ShowtimeSelection'
import SeatFoodSelection from './pages/booking/SeatFoodSelection'
import Payment from './pages/booking/Payment'
import BookingResult from './pages/booking/BookingResult'
import BookingHistory from './pages/booking/BookingHistory'
import BookingDetail from './pages/booking/BookingDetail'
import BookingManagement from './pages/booking/BookingManagement'
import ProductManagement from './pages/product/ProductManagement'
import ManagementLayout from './components/layout/ManagementLayout'
import RequireRole from './components/layout/RequireRole'
import UserProfile from './pages/user/UserProfile'
import UserManagement from './pages/user/UserManagement'
import PricingPolicyManagement from './pages/pricing/PricingPolicyManagement'

function resolveManagementRedirectPath() {
  try {
    const raw = localStorage.getItem('currentUser')
    if (!raw) return '/'
    const user = JSON.parse(raw)
    const role = String(user?.role || '').trim().toUpperCase()
    if (role === 'ADMIN') return '/management/movies'
    if (role === 'MANAGER') return '/management/halls'
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
        <Route path="/bookings" element={<BookingHistory />} />
        <Route path="/bookings/:id" element={<BookingDetail />} />
        <Route path="/booking" element={<Navigate to="/booking/showtimes" replace />} />
        <Route path="/booking/showtimes" element={<ShowtimeSelection />} />
        <Route path="/booking/seats" element={<SeatFoodSelection />} />
        <Route path="/booking/payment" element={<Payment />} />
        <Route path="/booking/result" element={<BookingResult />} />
        <Route path="/management" element={<ManagementLayout />}>
          <Route index element={<Navigate to={managementPath} replace />} />
          <Route path="movies" element={<MovieManagement />} />
          <Route path="movies/create" element={<MovieCreate />} />
          <Route path="movies/:id/edit" element={<MovieEdit />} />
          <Route path="cinemas" element={<CinemaManagement />} />
          <Route
            path="halls"
            element={
              <RequireRole allowedRoles={['MANAGER']} fallback="/management/movies">
                <HallManagement />
              </RequireRole>
            }
          />
          <Route
            path="showtimes"
            element={
              <RequireRole allowedRoles={['MANAGER']} fallback="/management/movies">
                <ShowtimeManagement />
              </RequireRole>
            }
          />
          <Route
            path="pricing-policies"
            element={
              <RequireRole allowedRoles={['MANAGER']} fallback="/management/movies">
                <PricingPolicyManagement />
              </RequireRole>
            }
          />
          <Route
            path="bookings"
            element={
              <RequireRole allowedRoles={['MANAGER']} fallback="/management/movies">
                <BookingManagement />
              </RequireRole>
            }
          />
          <Route
            path="products"
            element={
              <RequireRole allowedRoles={['MANAGER']} fallback="/management/movies">
                <ProductManagement />
              </RequireRole>
            }
          />
          <Route
            path="users"
            element={
              <RequireRole allowedRoles={['ADMIN', 'MANAGER']} fallback="/management/movies">
                <UserManagement />
              </RequireRole>
            }
          />
        </Route>
        <Route path="/" element={<Navigate to={rootPath} replace />} />
      </Routes>
    </BrowserRouter>
    </ToastProvider>
  )
}

export default App
