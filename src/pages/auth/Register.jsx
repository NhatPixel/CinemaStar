import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AuthPageShell,
  Input,
  Button,
  Icon,
  Text,
  Checkbox,
  CustomSelect,
  useToast,
  CustomLink,
} from '../../components'
import { register, toRegisterPayload } from '../../api/auth'
import { REGISTER_GENDER_OPTIONS } from '../../constants/genderMeta'

function Register() {
  const toast = useToast()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    dateOfBirth: '',
    gender: '',
    terms: false,
  })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.terms) {
      toast.error('Vui lòng đồng ý điều khoản sử dụng.')
      return
    }
    setSubmitting(true)
    try {
      const payload = toRegisterPayload({ ...formData, role: 'customer' })
      const data = await register(payload)
      toast.success(data?.message || 'Đăng ký thành công! Vui lòng nhập mã OTP đã gửi tới email.')
      navigate('/verify-otp', { state: { needPassword: false } })
    } catch (err) {
      toast.error(err.message || 'Đăng ký thất bại!')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthPageShell>
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-8 overflow-y-auto">
        <div className="w-full max-w-2xl mx-auto">
        {/* Header Text */}
        <div className="text-center mb-10">
          <Text variant="h1" className="mb-4 tracking-tight">
            Tạo tài khoản mới
          </Text>
          <Text variant="small" className="text-lg">
            Chào mừng bạn đến với dải ngân hà điện ảnh CinemaStar
          </Text>
        </div>

        {/* Registration Form Card */}
        <div className="glass-panel rounded-2xl p-8 shadow-2xl border border-white/5">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Họ và tên"
                name="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Nguyễn Văn A"
                icon="person"
              />
              <Input
                label="Số điện thoại"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="0901234567"
                icon="call"
              />
              <div className="md:col-span-2">
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="email@example.com"
                  icon="mail"
                />
              </div>
              <div className="md:col-span-2">
                <Input
                  label="Mật khẩu"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  icon="lock"
                  showPasswordToggle
                />
              </div>

              {/* Date of Birth */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 block ml-1">
                  Ngày sinh
                </label>
                <div className="relative">
                  <Icon 
                    name="calendar_today" 
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl"
                  />
                  <input
                    name="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className="w-full border rounded-lg py-3.5 pl-12 pr-4 text-white focus:outline-none focus:ring-2 transition-all"
                    style={{ 
                      backgroundColor: 'rgba(25, 16, 34, 0.5)',
                      borderColor: 'rgba(115, 17, 212, 0.2)'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#7311d4'
                      e.target.style.boxShadow = '0 0 0 2px rgba(115, 17, 212, 0.5)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(115, 17, 212, 0.2)'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                </div>
              </div>

              {/* Gender Select */}
              <CustomSelect
                label="Giới tính"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                icon="wc"
                placeholder="Chọn giới tính"
                options={REGISTER_GENDER_OPTIONS}
              />
            </div>

            {/* Terms Checkbox */}
            <Checkbox
              id="terms"
              name="terms"
              checked={formData.terms}
              onChange={handleChange}
              label="Đồng ý điều khoản"
              className="pt-2"
            >
              Tôi đồng ý với các{' '}
              <CustomLink href="#">Điều khoản sử dụng</CustomLink>
              {' '}và{' '}
              <CustomLink href="#">Chính sách bảo mật</CustomLink>
              {' '}của CinemaStar.
            </Checkbox>

            {/* Submit Button */}
            <Button type="submit" fullWidth size="lg" disabled={submitting}>
              {submitting ? 'Đang xử lý...' : 'Đăng ký ngay'}
            </Button>

            {/* Footer */}
            <p className="text-center text-slate-400 text-sm">
              Đã có tài khoản?{' '}
              <Link to="/login" className="text-primary font-bold hover:text-primary/80 ml-1 transition-colors">
                Đăng nhập
              </Link>
            </p>
          </form>
        </div>
        </div>
      </main>
    </AuthPageShell>
  )
}

export default Register
