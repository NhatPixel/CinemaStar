import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Icon, Input, Text, useToast } from '../../components'
import { forgotPassword } from '../../api/Auth/forgotPasswordApi'

function ForgotPassword() {
  const toast = useToast()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
  })

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      email: formData.email.trim(),
    }

    if (!payload.email) {
      toast.error('Vui lòng nhập email.')
      return
    }

    setSubmitting(true)
    try {
      await forgotPassword(payload)
      toast.success('Đã gửi mã OTP. Vui lòng nhập mã và mật khẩu mới.')
      navigate('/verify-otp')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="font-display text-slate-100 min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ backgroundColor: '#191022' }}
    >
      {/* Background Gradient Layer */}
      <div
        className="fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(circle at top right, #3b0764, transparent), radial-gradient(circle at bottom left, #1e1b4b, transparent)',
        }}
      />
      {/* Background Image Layer */}
      <div
        className="fixed inset-0 z-0 opacity-60"
        style={{
          backgroundImage: "url('/assets/auth-bg.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Content Overlay */}
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="glass-panel rounded-xl p-8 shadow-2xl">
          {/* Branding */}
          <div className="flex flex-col items-center mb-10">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(115,17,212,0.5)]"
              style={{ backgroundColor: '#7311d4' }}
            >
              <Icon name="mail" className="text-white text-4xl" />
            </div>
            <Text variant="h1" className="text-center">
              Quên mật khẩu
            </Text>
            <Text variant="small" className="mt-2 text-center text-slate-400">
              Nhập email để lấy lại quyền truy cập.
            </Text>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="dangbahien1@gmail.com"
              icon="mail"
            />

            <Button type="submit" fullWidth disabled={submitting}>
              {submitting ? 'Đang tạo request...' : 'Gửi yêu cầu'}
            </Button>
          </form>

          <p className="text-center mt-8 text-slate-400 text-sm">
            <Link
              to="/login"
              className="text-[#7311d4] font-bold hover:text-violet-400 transition-colors"
            >
              Quay lại đăng nhập
            </Link>
          </p>
        </div>
      </div>

      {/* Decorative Elements */}
      <div
        className="absolute top-0 right-0 w-96 h-96 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2"
        style={{ backgroundColor: 'rgba(115, 17, 212, 0.2)' }}
      />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/20 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2" />
    </div>
  )
}

export default ForgotPassword

