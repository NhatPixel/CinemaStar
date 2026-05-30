import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthPageShell, Button, Icon, Input, Text, useToast } from '../../components'
import { resendOtp, verifyOtp } from '../../api/auth'

const OTP_LEN = 6
const RESEND_INTERVAL_SEC = 60

function VerifyOtp() {
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const needPassword = Boolean(location.state?.needPassword ?? true)

  const [digits, setDigits] = useState(() => Array(OTP_LEN).fill(''))
  const [password, setPassword] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(RESEND_INTERVAL_SEC)
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)

  const inputRefs = useRef([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  useEffect(() => {
    const t = setInterval(() => {
      setSecondsLeft((s) => (s <= 0 ? 0 : s - 1))
    }, 1000)
    return () => clearInterval(t)
  }, [])

  const setDigit = useCallback((index, value) => {
    const d = value.replace(/\D/g, '').slice(-1)
    setDigits((prev) => {
      const next = [...prev]
      next[index] = d
      return next
    })
    return d
  }, [])

  const handleDigitChange = (index, e) => {
    const d = setDigit(index, e.target.value)
    if (d && index < OTP_LEN - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleDigitKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e) => {
    e.preventDefault()
    const raw = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LEN)
    if (!raw) return
    const next = Array(OTP_LEN)
      .fill('')
      .map((_, i) => raw[i] || '')
    setDigits(next)
    const focusAt = Math.min(raw.length, OTP_LEN - 1)
    inputRefs.current[focusAt]?.focus()
  }

  const handleResend = async () => {
    if (secondsLeft > 0) return
    setResending(true)
    try {
      const data = await resendOtp()
      toast.success(data?.message || 'Đã gửi lại mã OTP.')
      setSecondsLeft(RESEND_INTERVAL_SEC)
    } catch (err) {
      toast.error(err.message || 'Không thể gửi lại mã.')
    } finally {
      setResending(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const otp = digits.join('')
    if (otp.length !== OTP_LEN) {
      toast.error(`Vui lòng nhập đủ ${OTP_LEN} số mã OTP.`)
      return
    }
    if (needPassword && !password.trim()) {
      toast.error('Vui lòng nhập mật khẩu mới.')
      return
    }
    setSubmitting(true)
    try {
      let data
      if (needPassword) {
        data = await verifyOtp({ otp, password })
      } else {
        data = await verifyOtp({ otp })
      }
      toast.success(
        data?.message ||
          (needPassword
            ? 'Đặt lại mật khẩu thành công!'
            : 'Xác nhận OTP thành công!')
      )
      navigate('/login')
    } catch (err) {
      toast.error(err.message || 'Mã OTP không đúng hoặc đã hết hạn.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthPageShell>
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 w-full">
        <div className="w-full max-w-md">
          <div className="glass-panel rounded-xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(115,17,212,0.5)]"
              style={{ backgroundColor: '#7311d4' }}
            >
              <Icon name="verified_user" className="text-white text-4xl" />
            </div>
            <Text variant="h1" className="text-center">
              Xác nhận <span className="text-[#7311d4]">OTP</span>
            </Text>
            <Text variant="small" className="mt-2 text-center text-slate-400">
              {needPassword
                ? `Nhập mã ${OTP_LEN} số đã gửi tới email và mật khẩu mới. Gửi lại mã sau mỗi ${RESEND_INTERVAL_SEC}s.`
                : `Nhập mã ${OTP_LEN} số đã gửi tới email để hoàn tất đăng ký. Gửi lại mã sau mỗi ${RESEND_INTERVAL_SEC}s.`}
            </Text>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="text-sm font-medium text-slate-300 flex justify-center mb-2 px-1">
                Mã OTP
              </label>
              <div className="flex justify-center gap-2 sm:gap-3" onPaste={handleOtpPaste}>
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      inputRefs.current[i] = el
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleDigitChange(i, e)}
                    onKeyDown={(e) => handleDigitKeyDown(i, e)}
                    className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-lg bg-slate-900/80 border border-slate-600 text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#7311d4]/60 focus:border-[#7311d4]"
                  />
                ))}
              </div>
            </div>

            {needPassword ? (
              <Input
                label="Mật khẩu mới"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                icon="lock"
                showPasswordToggle
              />
            ) : null}

            <Button type="submit" fullWidth disabled={submitting}>
              {submitting ? 'Đang xác nhận...' : 'Xác nhận'}
            </Button>
          </form>

          <div className="mt-6 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={handleResend}
              disabled={secondsLeft > 0 || resending}
              className="text-sm font-medium text-[#7311d4] hover:text-violet-400 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
            >
              {resending
                ? 'Đang gửi...'
                : secondsLeft > 0
                  ? `Gửi lại mã (${secondsLeft}s)`
                  : 'Gửi lại mã OTP'}
            </button>
          </div>

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

export default VerifyOtp
