import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  AuthPageShell,
  Input,
  Button,
  Divider,
  Icon,
  Text,
  useToast,
  CustomLink,
} from '../../components'
import { login, redirectToGoogleLogin } from '../../api/auth'
import { resetAuthSessionRedirecting } from '../../utils/authSession'

function Login() {
  const toast = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    resetAuthSessionRedirecting()
  }, [])
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  useEffect(() => {
    const oauth = searchParams.get('oauth')
    const status = searchParams.get('status')
    const code = searchParams.get('code')
    if (oauth === 'google' && status === 'error') {
      const messages = {
        state_invalid: 'Phiên đăng nhập Google không hợp lệ hoặc đã hết hạn.',
        code_exchange_failed: 'Không thể xác thực với Google.',
        token_invalid: 'Token Google không hợp lệ.',
        email_conflict: 'Email đã được đăng ký bằng tài khoản khác.',
        login_failed: 'Đăng nhập Google thất bại.',
        profile_creation_failed: 'Không thể tạo hồ sơ người dùng.',
        oauth_denied: 'Bạn đã hủy đăng nhập Google.',
      }
      toast.error(messages[code] || 'Đăng nhập Google thất bại.')
    }
  }, [searchParams, toast])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const data = await login(formData.email, formData.password)
      toast.success(data?.message || 'Đăng nhập thành công!')
      navigate('/movies')
    } catch (err) {
      toast.error(err.message || 'Đăng nhập thất bại!')
    }
  }

  const handleGoogleAuth = () => {
    redirectToGoogleLogin()
  }

  return (
    <AuthPageShell>
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 w-full">
        <div className="w-full max-w-md">
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
              label="Email"
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
                <CustomLink href="/forgot-password" size="xs">
                  Quên mật khẩu?
                </CustomLink>
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
          <Button variant="secondary" fullWidth onClick={handleGoogleAuth}>
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

          {/* Footer Link */}
          <p className="text-center mt-10 text-slate-400 text-sm">
            Bạn chưa có tài khoản?{' '}
            <Link to="/register" className="text-primary font-bold hover:text-primary/80 ml-1 transition-colors">
              Đăng ký ngay
            </Link>
          </p>
        </div>
        </div>
      </main>
    </AuthPageShell>
  )
}

export default Login
