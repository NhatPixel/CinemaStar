import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthPageShell, Button, Icon, Input, Text, useToast } from '../../components'
import { forgotPassword } from '../../api/auth'

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
      const data = await forgotPassword(payload)
      toast.success(data?.message || 'Đã gửi mã OTP. Vui lòng nhập mã và mật khẩu mới.')
      navigate('/verify-otp')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthPageShell>
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 w-full">
        <div className="w-full max-w-md">
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
              placeholder="user@example.com"
              icon="mail"
            />

            <Button type="submit" fullWidth disabled={submitting}>
              {submitting ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu'}
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
      </main>
    </AuthPageShell>
  )
}

export default ForgotPassword

