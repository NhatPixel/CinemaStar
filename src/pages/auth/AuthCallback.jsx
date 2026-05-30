import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AuthPageShell, Text, useToast } from '../../components'
import { getCurrentUser } from '../../api/user'

const GOOGLE_ERROR_MESSAGES = {
  state_invalid: 'Phiên đăng nhập Google không hợp lệ hoặc đã hết hạn.',
  code_exchange_failed: 'Không thể xác thực với Google.',
  token_invalid: 'Token Google không hợp lệ.',
  email_conflict: 'Email đã được đăng ký bằng tài khoản khác.',
  login_failed: 'Đăng nhập Google thất bại.',
  profile_creation_failed: 'Không thể tạo hồ sơ người dùng.',
  oauth_denied: 'Bạn đã hủy đăng nhập Google.',
}

function AuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => {
    const provider = searchParams.get('oauth')
    const status = searchParams.get('status')
    const code = searchParams.get('code')

    if (provider !== 'google') {
      navigate('/login', { replace: true })
      return
    }

    if (status === 'error') {
      const message = GOOGLE_ERROR_MESSAGES[code] || 'Đăng nhập Google thất bại.'
      toast.error(message)
      navigate('/login', { replace: true })
      return
    }

    if (status !== 'success') {
      navigate('/login', { replace: true })
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        await getCurrentUser()
        if (cancelled) return
        toast.success('Đăng nhập Google thành công')
        navigate('/movies', { replace: true })
      } catch (e) {
        if (cancelled) return
        toast.error(e?.message || 'Không tải được thông tin người dùng sau đăng nhập Google')
        navigate('/login', { replace: true })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [navigate, searchParams, toast])

  return (
    <AuthPageShell>
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <Text variant="small" className="text-slate-400">
          Đang hoàn tất đăng nhập Google...
        </Text>
      </main>
    </AuthPageShell>
  )
}

export default AuthCallback
