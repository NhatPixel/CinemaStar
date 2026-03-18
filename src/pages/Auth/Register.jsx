import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Input,
  Button,
  Icon,
  Text,
  Checkbox,
  SelectableCard,
  CustomSelect,
  SearchableSelect,
} from '../../components/ui'
import UILink from '../../components/ui/Link'
import { getBanks } from '../../api/bankApi'

function Register() {
  const [formData, setFormData] = useState({
    role: 'customer',
    fullName: '',
    phone: '',
    email: '',
    password: '',
    // Manager-only fields
    bank: '',
    bankAccountNumber: '',
    bankAccountName: '',
    // Common fields
    dateOfBirth: '',
    gender: '',
    terms: false,
  })

  const [banks, setBanks] = useState([])
  const [banksError, setBanksError] = useState(null)

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        setBanksError(null)
        const bankList = await getBanks()
        setBanks(bankList)
      } catch (error) {
        console.error('Error fetching banks:', error)
        setBanksError(
          error?.message || 'Không thể kết nối tới dịch vụ ngân hàng'
        )
      }
    }

    fetchBanks()
  }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log('Register submitted:', formData)
    // Handle registration logic here
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
      <div className="relative z-10 w-full max-w-2xl px-6 py-12">
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
            {/* Role Selection */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider block">
                Bạn là ai?
              </label>
              <div className="grid grid-cols-3 gap-3">
                <SelectableCard
                  selected={formData.role === 'customer'}
                  icon="person"
                  label="Khách hàng"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, role: 'customer' }))
                  }
                />
                <SelectableCard
                  selected={formData.role === 'staff'}
                  icon="badge"
                  label="Nhân viên"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, role: 'staff' }))
                  }
                />
                <SelectableCard
                  selected={formData.role === 'manager'}
                  icon="admin_panel_settings"
                  label="Quản lý"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, role: 'manager' }))
                  }
                />
              </div>
            </div>

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

              {/* Bank information - only for manager role */}
              {formData.role === 'manager' && (
                <>
                  <div className="md:col-span-2">
                    <SearchableSelect
                      label="Ngân hàng"
                      name="bank"
                      value={formData.bank}
                      onChange={handleChange}
                      icon="account_balance"
                      placeholder="Chọn ngân hàng"
                      searchPlaceholder="Nhập tên hoặc mã ngân hàng"
                      options={banks.map((bank) => ({
                        value: bank.code,
                        label: `${bank.shortName} (${bank.name})`,
                      }))}
                    />
                    {banksError && (
                      <p className="mt-2 text-sm text-red-400">
                        {banksError}
                      </p>
                    )}
                  </div>
                  <Input
                    label="Số tài khoản"
                    name="bankAccountNumber"
                    type="text"
                    value={formData.bankAccountNumber}
                    onChange={handleChange}
                    placeholder="Nhập số tài khoản"
                    icon="vignette"
                  />
                  <Input
                    label="Tên tài khoản"
                    name="bankAccountName"
                    type="text"
                    value={formData.bankAccountName}
                    onChange={handleChange}
                    placeholder="NGUYEN VAN A"
                    icon="badge"
                  />
                </>
              )}
              
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
                options={[
                  { value: 'male', label: 'Nam' },
                  { value: 'female', label: 'Nữ' },
                  { value: 'other', label: 'Khác' },
                ]}
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
              <UILink href="#">Điều khoản sử dụng</UILink>
              {' '}và{' '}
              <UILink href="#">Chính sách bảo mật</UILink>
              {' '}của CinemaStar.
            </Checkbox>

            {/* Submit Button */}
            <Button type="submit" fullWidth size="lg">
              Đăng ký ngay
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

      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" style={{ backgroundColor: 'rgba(115, 17, 212, 0.2)' }}></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/20 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2"></div>
    </div>
  )
}

export default Register
