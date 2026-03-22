import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Input, Button, Divider, Icon, Text } from '../../components/ui'
import { login } from '../../api/Login/LoginApi'
import UILink from '../../components/ui/Link'

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      // Gọi API đăng nhập
      const result = await login(formData.email, formData.password)
      // Xử lý khi đăng nhập thành công (ví dụ: lưu token, chuyển trang, ...)
      alert('Đăng nhập thành công!')
      // console.log('Login success:', result)
      // TODO: Lưu token vào localStorage/sessionStorage nếu cần
      // TODO: Chuyển hướng sang trang chính hoặc dashboard
    } catch (err) {
      // Xử lý khi đăng nhập thất bại
      alert(err.message || 'Đăng nhập thất bại!')
      // console.error('Login error:', err)
    }
  }

  const handleFacebookAuth = () => {
    console.log('Facebook auth')
  }

  const handleGoogleAuth = () => {
    console.log('Google auth')
  }

  return (
    <div className="font-display text-slate-100 min-h-screen flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: '#191022' }}>
      {/* Background Gradient Layer */}
      <div
        className="fixed inset-0 z-0"
        style={{
          background: 'radial-gradient(circle at top right, #3b0764, transparent), radial-gradient(circle at bottom left, #1e1b4b, transparent)'
        }}
      />
      {/* Background Image Layer */}
      <div
        className="fixed inset-0 z-0 opacity-60"
        style={{
          backgroundImage: "url('/assets/auth-bg.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />

      {/* Content Overlay */}
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="glass-panel rounded-xl p-8 shadow-2xl">
          {/* Branding */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(115,17,212,0.5)]" style={{ backgroundColor: '#7311d4' }}>
              <Icon name="movie_filter" className="text-white text-4xl" />
            </div>
            <Text variant="h1">
              Cinema<span className="text-[#7311d4]">Star</span>
            </Text>
            <Text variant="small" className="mt-2">
              Trải nghiệm điện ảnh tương lai
            </Text>
          </div>

          {/* Login Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            <Input
              label="Email hoặc Số điện thoại"
              name="email"
              type="text"
              value={formData.email}
              onChange={handleChange}
              placeholder="user@example.com"
              icon="person"
            />

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-sm font-medium text-slate-300 block">Mật khẩu</label>
                <UILink href="#" size="xs">
                  Quên mật khẩu?
                </UILink>
              </div>
              <Input
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                icon="lock"
                showPasswordToggle
              />
            </div>

            <Button type="submit" fullWidth onClick={handleSubmit}>
              Đăng nhập
            </Button>
          </form>

          {/* Social Login Divider */}
          <Divider text="Hoặc đăng nhập bằng" />

          {/* Social Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <Button variant="secondary" onClick={handleFacebookAuth}>
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.5 12c0-5.799-4.701-10.5-10.5-10.5S1.5 6.201 1.5 12c0 5.239 3.826 9.588 8.813 10.352V15.11H7.727v-3.11h2.586V9.63c0-2.552 1.52-3.962 3.846-3.962 1.114 0 2.279.199 2.279.199v2.506h-1.284c-1.265 0-1.656.785-1.656 1.59v1.908h2.824l-.451 3.11h-2.373v7.242C18.674 21.588 22.5 17.239 22.5 12z"></path>
                </svg>
                <span className="text-sm font-medium">Facebook</span>
              </div>
            </Button>
            <Button variant="secondary" onClick={handleGoogleAuth}>
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"></path>
                </svg>
                <span className="text-sm font-medium">Google</span>
              </div>
            </Button>
          </div>

          {/* Footer Link */}
          <p className="text-center mt-10 text-slate-400 text-sm">
            Bạn chưa có tài khoản?{' '}
            <Link to="/register" className="text-primary font-bold hover:text-primary/80 ml-1 transition-colors">
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" style={{ backgroundColor: 'rgba(115, 17, 212, 0.2)' }}></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/20 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2"></div>
    </div>
  )
}

export default Login
