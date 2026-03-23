import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ToastProvider } from './components/ui'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import VerifyOtp from './pages/Auth/VerifyOtp'
import MovieList from './pages/Movie/MovieList'
import MovieDetail from './pages/Movie/MovieDetail'
import MovieManagement from './pages/Movie/MovieManagement'
import MovieCreate from './pages/Movie/MovieCreate'
import MovieEdit from './pages/Movie/MovieEdit'

function App() {
  return (
    <ToastProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/movies" element={<MovieList />} />
        <Route path="/movies/:id" element={<MovieDetail />} />
        <Route path="/management/movies" element={<MovieManagement />} />
        <Route path="/management/movies/new" element={<MovieCreate />} />
        <Route path="/management/movies/:id/edit" element={<MovieEdit />} />
        <Route path="/" element={<Login />} />
      </Routes>
    </BrowserRouter>
    </ToastProvider>
  )
}

export default App
