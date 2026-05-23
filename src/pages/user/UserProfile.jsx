import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  AppHeader,
  AppFooter,
  Avatar,
  Button,
  ConfirmModal,
  Icon,
  Text,
  Input,
  CustomSelect,
  useToast,
} from '../../components'
import {
  getCurrentUser,
  updateCustomerProfile,
  updateManagerProfile,
  updateStaffProfile,
} from '../../api/user'
import { formatGenderLabel, Gender } from '../../constants/genderMeta'
import { formatRoleLabel } from '../../constants/userRoleLabels'
import { PAGE_SHELL } from '../../constants/pageLayout'

function readStoredUser() {
  try {
    const raw = localStorage.getItem('currentUser')
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function formatDisplayDate(value) {
  if (value == null || value === '') return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatBirth(value) {
  if (value == null || value === '') return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('vi-VN')
}

function normalizeRole(role) {
  return String(role || '')
    .trim()
    .toUpperCase()
}

const GENDER_FORM_OPTIONS = [
  { value: Gender.MALE, label: 'Nam' },
  { value: Gender.FEMALE, label: 'Nữ' },
  { value: Gender.OTHER, label: 'Khác' },
]

function toDateInputValue(value) {
  if (value == null || value === '') return ''
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function getProfileUpdateFn(roleKey) {
  const r = normalizeRole(roleKey)
  if (r === 'STAFF') return updateStaffProfile
  if (r === 'MANAGER') return updateManagerProfile
  if (r === 'ADMIN') return null
  return updateCustomerProfile
}

function needsBankFields(roleKey) {
  const r = normalizeRole(roleKey)
  return r === 'MANAGER' || r === 'STAFF'
}

const EMPTY_FORM = {
  name: '',
  email: '',
  dob: '',
  gender: Gender.MALE,
  phone: '',
  bankCode: '',
  accountNumber: '',
  accountName: '',
}

function buildFormDataFromUser(user) {
  if (!user) return { ...EMPTY_FORM }
  const birthRaw = user?.birthDate ?? user?.dateOfBirth ?? user?.dob
  return {
    name: String(user?.name || user?.fullName || '').trim(),
    email: String(user?.email || '').trim(),
    dob: toDateInputValue(birthRaw),
    gender: String(user?.gender || Gender.MALE).trim().toUpperCase() || Gender.MALE,
    phone: String(user?.phone || user?.phoneNumber || '').trim(),
    bankCode: String(user?.bankCode ?? '').trim(),
    accountNumber: String(user?.accountNumber ?? '').trim(),
    accountName: String(user?.accountName ?? '').trim(),
  }
}

function UserProfile() {
  const toast = useToast()
  const navigate = useNavigate()
  const [user, setUser] = useState(() => readStoredUser())
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({ ...EMPTY_FORM })
  const [showSaveConfirm, setShowSaveConfirm] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  useEffect(() => {
    const onStorage = () => setUser(readStoredUser())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    let cancelled = false
    const ac = new AbortController()
    ;(async () => {
      try {
        setLoading(true)
        const data = await getCurrentUser({ signal: ac.signal })
        if (!cancelled && data) {
          setUser(data)
        }
      } catch (err) {
        if (cancelled || err?.name === 'AbortError') return
        if (err?.status === 401) {
          navigate('/login', { replace: true })
          return
        }
        toast.error(err?.message || 'Không tải được hồ sơ')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
      ac.abort()
    }
  }, [navigate, toast])

  const role = normalizeRole(user?.role)
  const canEditProfile = role !== 'ADMIN'
  const isCustomerRole = role === 'CUSTOMER' || role === 'USER'

  const display = useMemo(() => {
    const name =
      String(user?.name || user?.fullName || '').trim() || 'Người dùng'
    const email = String(user?.email || '').trim() || '—'
    const phone = String(user?.phone || user?.phoneNumber || '').trim() || '—'
    const gender = formatGenderLabel(user?.gender)
    const birthRaw = user?.birthDate ?? user?.dateOfBirth ?? user?.dob
    const created =
      user?.timeCreated ?? user?.createdAt ?? user?.created_at
    const updated =
      user?.timeUpdated ?? user?.updatedAt ?? user?.updated_at
    const bankCode = String(user?.bankCode ?? '').trim()
    const accountNumber = String(user?.accountNumber ?? '').trim()
    const accountName = String(user?.accountName ?? '').trim()

    return {
      name,
      email,
      phone,
      gender,
      birth: formatBirth(birthRaw),
      created: formatDisplayDate(created),
      updated: formatDisplayDate(updated),
      roleLabel: formatRoleLabel(user?.role),
      uuid: user?.id != null ? String(user.id) : '—',
      avatarUrl: String(user?.avatarUrl || user?.avatar || user?.photoUrl || '').trim(),
      bankCode,
      accountNumber,
      accountName,
      hasBank: Boolean(bankCode && accountNumber),
    }
  }, [user, role])

  const syncFormFromUser = () => {
    if (!user) return
    setFormData(buildFormDataFromUser(user))
  }

  const isProfileDirty = useMemo(() => {
    if (!editing || !user) return false
    const b = buildFormDataFromUser(user)
    return (
      formData.name.trim() !== b.name ||
      formData.email.trim() !== b.email ||
      (formData.dob || '') !== (b.dob || '') ||
      formData.gender !== b.gender ||
      formData.phone.trim() !== b.phone ||
      formData.bankCode.trim() !== b.bankCode ||
      formData.accountNumber.trim() !== b.accountNumber ||
      formData.accountName.trim() !== b.accountName
    )
  }, [editing, user, formData])

  const startEditing = () => {
    if (!user || !canEditProfile) return
    syncFormFromUser()
    setEditing(true)
  }

  useEffect(() => {
    if (normalizeRole(user?.role) !== 'ADMIN') return
    setEditing(false)
    setShowSaveConfirm(false)
    setShowCancelConfirm(false)
  }, [user?.role])

  const cancelEditing = () => {
    if (saving) return
    syncFormFromUser()
    setEditing(false)
    setShowCancelConfirm(false)
  }

  const requestCancelEdit = () => {
    if (saving || !canEditProfile) return
    if (isProfileDirty) {
      setShowCancelConfirm(true)
      return
    }
    cancelEditing()
  }

  const requestSaveProfile = () => {
    if (!user || saving || !canEditProfile) return
    const name = formData.name.trim()
    const email = formData.email.trim()
    if (!name) {
      toast.error('Vui lòng nhập họ và tên')
      return
    }
    if (!email) {
      toast.error('Vui lòng nhập email')
      return
    }
    setShowSaveConfirm(true)
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const performSaveProfile = async () => {
    if (!user || saving) return
    if (normalizeRole(user?.role) === 'ADMIN') {
      toast.error('Quản trị viên không thể chỉnh sửa hồ sơ tại đây.')
      setShowSaveConfirm(false)
      return
    }
    const name = formData.name.trim()
    const email = formData.email.trim()
    if (!name) {
      toast.error('Vui lòng nhập họ và tên')
      setShowSaveConfirm(false)
      return
    }
    if (!email) {
      toast.error('Vui lòng nhập email')
      setShowSaveConfirm(false)
      return
    }

    const basePayload = {
      name,
      email,
      dob: formData.dob.trim() || undefined,
      gender: formData.gender,
      phone: formData.phone.trim(),
    }

    let payload = basePayload
    if (needsBankFields(user?.role)) {
      payload = {
        ...basePayload,
        bankCode: formData.bankCode.trim(),
        accountNumber: formData.accountNumber.trim(),
        accountName: formData.accountName.trim(),
      }
    }

    try {
      setSaving(true)
      const updateFn = getProfileUpdateFn(user?.role)
      if (!updateFn) {
        toast.error('Không thể cập nhật hồ sơ cho vai trò này.')
        setShowSaveConfirm(false)
        return
      }
      const data = await updateFn(payload)
      if (data) {
        setUser(data)
      } else {
        const fresh = await getCurrentUser()
        if (fresh) setUser(fresh)
      }
      toast.success(
        typeof data?.message === 'string'
          ? data.message
          : 'Cập nhật hồ sơ thành công',
      )
      setShowSaveConfirm(false)
      setEditing(false)
    } catch (err) {
      toast.error(err?.message || 'Không thể cập nhật hồ sơ')
    } finally {
      setSaving(false)
    }
  }

  if (loading && !user) {
    return (
      <div className={PAGE_SHELL}>
        <AppHeader showLoginButton={false} />
        <main className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-500 dark:text-slate-400">
          Đang tải hồ sơ...
        </main>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className={PAGE_SHELL}>
      <AppHeader showLoginButton={false} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
            Đang đồng bộ hồ sơ từ máy chủ...
          </div>
        ) : null}
        <header className="flex flex-col gap-6 sm:flex-row sm:justify-between sm:items-end mb-8">
          <div>
            <nav className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-4">
              <a className="hover:text-primary" href="/">
                Trang chủ
              </a>
              <Icon name="chevron_right" className="text-xs" />
              <span className="text-primary font-medium">Chi tiết hồ sơ</span>
            </nav>
            <Text variant="h1" className="text-4xl font-bold tracking-tight mb-2">
              Hồ sơ người dùng
            </Text>
          </div>
          {canEditProfile ? (
            <div className="flex flex-wrap items-center gap-3 justify-end shrink-0">
              {editing ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    className="rounded-xl shrink-0"
                    disabled={saving}
                    onClick={requestCancelEdit}
                  >
                    Hủy
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    className="flex items-center justify-center gap-2 rounded-xl shadow-lg shrink-0"
                    disabled={saving}
                    onClick={requestSaveProfile}
                  >
                    {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  className="flex items-center justify-center gap-2 rounded-xl shadow-lg shrink-0"
                  onClick={startEditing}
                >
                  <Icon name="edit" className="text-lg" />
                  Chỉnh sửa hồ sơ
                </Button>
              )}
            </div>
          ) : null}
        </header>

        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-4 space-y-8">
            <section className="rounded-3xl p-8 flex flex-col items-center text-center relative overflow-hidden glass-panel">
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-primary/20 to-transparent pointer-events-none" />
              <div className="relative mx-auto mt-8 mb-6 w-fit">
                <Avatar
                  name={display.name}
                  src={display.avatarUrl}
                  asLink={false}
                  className="h-32 w-32 border-4 border-background-light dark:border-background-dark text-4xl ring-4 ring-primary/20"
                />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {editing
                  ? formData.name.trim() || display.name
                  : display.name}
              </h2>
              <p className="text-primary font-medium tracking-wide mt-1">{display.roleLabel}</p>
            </section>

            {isCustomerRole ? (
              <section className="rounded-3xl p-8 glass-panel text-center text-sm text-slate-600 dark:text-slate-400">
                Tài khoản thành viên CinemaStar — xem lịch sử vé và ưu đãi tại quầy hoặc ứng dụng.
              </section>
            ) : null}
          </div>

          <div className="col-span-12 lg:col-span-8 space-y-8">
            <section className="rounded-3xl p-8 sm:p-10 glass-panel">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon name="person" className="text-primary text-xl" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Thông tin cá nhân
                </h3>
              </div>
              {editing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                  <Input
                    label="Họ và tên"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    icon="person"
                  />
                  <Input
                    label="Ngày sinh"
                    name="dob"
                    type="date"
                    value={formData.dob}
                    onChange={handleFormChange}
                  />
                  <CustomSelect
                    label="Giới tính"
                    name="gender"
                    value={formData.gender}
                    onChange={handleFormChange}
                    icon="wc"
                    placeholder="Chọn giới tính"
                    options={GENDER_FORM_OPTIONS}
                  />
                  <Input
                    label="Số điện thoại"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleFormChange}
                    icon="call"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                  {[
                    ['Họ và tên', display.name],
                    ['Ngày sinh', display.birth],
                    ['Giới tính', display.gender],
                    ['Số điện thoại', display.phone],
                  ].map(([label, value]) => (
                    <div key={label} className="group">
                      <span className="text-xs font-bold uppercase tracking-widest text-primary/70 block mb-2">
                        {label}
                      </span>
                      <p className="text-lg font-medium text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-600/50 pb-2 transition-colors group-hover:border-primary/40">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-3xl p-8 sm:p-10 glass-panel">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon name="settings_account_box" className="text-primary text-xl" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Chi tiết tài khoản
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                <div className="md:col-span-2 group">
                  <span className="text-xs font-bold uppercase tracking-widest text-primary/70 block mb-2">
                    ID
                  </span>
                  <div className="border-b border-slate-200 dark:border-slate-600/50 pb-2">
                    <code className="text-sm font-mono text-primary bg-primary/5 px-2 py-0.5 rounded break-all">
                      {display.uuid}
                    </code>
                  </div>
                </div>
                <div className="group md:col-span-2">
                  {editing ? (
                    <Input
                      label="Email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleFormChange}
                      icon="mail"
                    />
                  ) : (
                    <>
                      <span className="text-xs font-bold uppercase tracking-widest text-primary/70 block mb-2">
                        Email
                      </span>
                      <p className="text-lg font-medium text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-600/50 pb-2 group-hover:border-primary/40 transition-colors">
                        {display.email}
                      </p>
                    </>
                  )}
                </div>
                <div className="group">
                  <span className="text-xs font-bold uppercase tracking-widest text-primary/70 block mb-2">
                    Ngày tạo
                  </span>
                  <p className="text-lg font-medium text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-600/50 pb-2 group-hover:border-primary/40 transition-colors">
                    {display.created}
                  </p>
                </div>
                <div className="group">
                  <span className="text-xs font-bold uppercase tracking-widest text-primary/70 block mb-2">
                    Ngày cập nhật
                  </span>
                  <p className="text-lg font-medium text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-600/50 pb-2 group-hover:border-primary/40 transition-colors">
                    {display.updated}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl p-8 sm:p-10 glass-panel">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon name="account_balance" className="text-primary text-xl" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Thông tin ngân hàng
                </h3>
              </div>
              <div className="rounded-3xl p-8 border border-primary/15 bg-primary/5 dark:bg-primary/10 backdrop-blur-sm">
                {needsBankFields(user?.role) && editing ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Input
                      label="Mã ngân hàng"
                      name="bankCode"
                      value={formData.bankCode}
                      onChange={handleFormChange}
                      icon="account_balance"
                    />
                    <Input
                      label="Số tài khoản"
                      name="accountNumber"
                      value={formData.accountNumber}
                      onChange={handleFormChange}
                    />
                    <Input
                      label="Chủ tài khoản"
                      name="accountName"
                      value={formData.accountName}
                      onChange={handleFormChange}
                      icon="badge"
                    />
                  </div>
                ) : display.hasBank ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-1">
                      <span className="text-xs font-bold uppercase tracking-widest text-primary/70 block">
                        Mã ngân hàng
                      </span>
                      <p className="text-lg font-bold text-slate-800 dark:text-slate-100 font-mono">
                        {display.bankCode}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-bold uppercase tracking-widest text-primary/70 block">
                        Số tài khoản
                      </span>
                      <p className="text-lg font-mono tracking-wider font-semibold text-slate-800 dark:text-slate-100">
                        {display.accountNumber}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-bold uppercase tracking-widest text-primary/70 block">
                        Chủ tài khoản
                      </span>
                      <p className="text-lg font-bold text-slate-800 dark:text-slate-100 uppercase">
                        {display.accountName || '—'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                    Chưa có thông tin ngân hàng từ hệ thống.
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      <ConfirmModal
        isOpen={showSaveConfirm}
        title="Lưu thay đổi hồ sơ"
        message="Bạn có chắc muốn lưu các thay đổi thông tin hồ sơ không?"
        onConfirm={performSaveProfile}
        onCancel={() => setShowSaveConfirm(false)}
        disableConfirm={saving}
      />
      <ConfirmModal
        isOpen={showCancelConfirm}
        title="Hủy chỉnh sửa"
        message="Các thay đổi chưa được lưu sẽ bị mất. Bạn có muốn hủy chỉnh sửa không?"
        onConfirm={cancelEditing}
        onCancel={() => setShowCancelConfirm(false)}
        confirmVariant="primary"
      />

      <AppFooter />
    </div>
  )
}

export default UserProfile
