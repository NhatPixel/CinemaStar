import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Button from '../Button'
import CustomSelect from '../CustomSelect'
import Icon from '../Icon'
import Input from '../Input'
import SearchableSelect from '../SearchableSelect'
import Text from '../Text'
import { useToast } from '../useToast'
import { getBanks } from '../../api/bank'
import { registerManager, registerStaff } from '../../api/auth'
import { getUserById } from '../../api/user'
import { Gender, formatGenderLabel } from '../../constants/genderMeta'
import { USER_ROLE_LABEL_VI } from '../../constants/userRoleLabels'
import {
  MANAGED_USER_ROLES,
  needsBankFieldsForRole,
} from '../../constants/userManagementOptions'

const GENDER_OPTIONS = [
  { value: Gender.MALE, label: 'Nam' },
  { value: Gender.FEMALE, label: 'Nữ' },
  { value: Gender.OTHER, label: 'Khác' },
]

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  phone: '',
  dob: '',
  gender: Gender.MALE,
  bankCode: '',
  accountNumber: '',
  accountName: '',
}

function userToForm(user) {
  if (!user) return { ...EMPTY_FORM }
  const dobRaw = user.dob ?? user.dateOfBirth ?? user.birthDate
  let dob = ''
  if (dobRaw) {
    const d = new Date(dobRaw)
    if (!Number.isNaN(d.getTime())) dob = d.toISOString().slice(0, 10)
  }
  return {
    name: user.name || '',
    email: user.email || '',
    password: '',
    phone: user.phone || '',
    dob,
    gender: String(user.gender || Gender.MALE).trim().toUpperCase() || Gender.MALE,
    bankCode: user.bankCode || '',
    accountNumber: user.accountNumber || '',
    accountName: user.accountName || '',
  }
}

function buildRegisterPayload(form, managedRole) {
  const payload = {
    name: form.name.trim(),
    email: form.email.trim(),
    password: form.password,
    dob: form.dob,
    gender: form.gender,
    phone: form.phone.trim(),
  }
  if (needsBankFieldsForRole(managedRole)) {
    payload.bankCode = form.bankCode?.trim() || undefined
    payload.accountNumber = form.accountNumber?.trim() || undefined
    payload.accountName = form.accountName?.trim() || undefined
  }
  return payload
}

function UserModal({
  isOpen,
  mode = 'create',
  managedRole = MANAGED_USER_ROLES.STAFF,
  userId,
  onCancel,
  onSubmitted,
}) {
  const toast = useToast()
  const isCreate = mode === 'create'
  const isView = mode === 'view'
  const readOnly = isView
  const showBank = needsBankFieldsForRole(managedRole)
  const roleLabel = USER_ROLE_LABEL_VI[managedRole] || managedRole

  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [submitting, setSubmitting] = useState(false)
  const [banks, setBanks] = useState([])

  useEffect(() => {
    if (!isOpen || !showBank) return undefined
    let cancelled = false
    ;(async () => {
      try {
        const list = await getBanks()
        if (!cancelled) setBanks(list || [])
      } catch {
        if (!cancelled) setBanks([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isOpen, showBank])

  useEffect(() => {
    if (!isOpen) return undefined
    if (isCreate) {
      setDetail(null)
      setForm({ ...EMPTY_FORM })
      setSubmitting(false)
      return undefined
    }
    if (!userId) return undefined

    const controller = new AbortController()
    let cancelled = false
    setLoadingDetail(true)

    ;(async () => {
      try {
        const data = await getUserById(userId, { signal: controller.signal })
        if (cancelled) return
        setDetail(data)
        setForm(userToForm(data))
      } catch (e) {
        if (cancelled || e?.name === 'AbortError') return
        toast.error(e?.message || 'Không tải được thông tin người dùng')
        onCancel?.()
      } finally {
        if (!cancelled) setLoadingDetail(false)
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [isOpen, isCreate, userId, toast, onCancel])

  const handleChange = (e) => {
    if (readOnly) return
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (readOnly || submitting || loadingDetail) return

    const name = form.name.trim()
    if (!name) return toast.error('Vui lòng nhập họ tên')
    if (!form.email.trim()) return toast.error('Vui lòng nhập email')
    if (!form.phone.trim()) return toast.error('Vui lòng nhập số điện thoại')
    if (!form.dob) return toast.error('Vui lòng chọn ngày sinh')
    if (!form.password || form.password.length < 8) {
      return toast.error('Mật khẩu phải từ 8 ký tự')
    }

    const payload = buildRegisterPayload(form, managedRole)

    try {
      setSubmitting(true)
      let data
      if (managedRole === MANAGED_USER_ROLES.MANAGER) {
        data = await registerManager(payload)
      } else {
        data = await registerStaff(payload)
      }
      toast.success(data?.message || `Tạo ${roleLabel.toLowerCase()} thành công`)
      onSubmitted?.(data)
    } catch (err) {
      toast.error(err?.message || 'Tạo tài khoản thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  const title = isView
    ? `Chi tiết ${roleLabel.toLowerCase()}`
    : `Tạo ${roleLabel.toLowerCase()} mới`

  const bankOptions = banks.map((bank) => ({
    value: bank.code,
    label: `${bank.shortName || bank.code} (${bank.name || bank.code})`,
  }))

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Đóng"
        className="absolute inset-0 bg-black/60"
        onClick={() => {
          if (!submitting && !loadingDetail) onCancel?.()
        }}
      />
      <div className="relative z-[101] w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl dark:border-primary/20 dark:bg-background-dark">
        <div className="flex items-start justify-between gap-3 mb-6">
          <Text variant="h2" className="text-2xl font-bold text-slate-900 dark:text-white">
            {title}
          </Text>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="p-2 rounded-lg"
            disabled={submitting}
            onClick={onCancel}
          >
            <Icon name="close" />
          </Button>
        </div>

        {loadingDetail ? (
          <p className="text-sm text-slate-500 mb-4">Đang tải thông tin...</p>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            {isView && detail?.id ? (
              <Input
                label="Mã người dùng"
                name="userIdView"
                value={String(detail.id)}
                onChange={() => {}}
                disabled
                readOnly
              />
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Họ và tên"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Nguyễn Văn A"
                icon="person"
                disabled={readOnly}
                readOnly={readOnly}
              />
              <Input
                label="Số điện thoại"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="0901234567"
                icon="call"
                disabled={readOnly}
                readOnly={readOnly}
              />
            </div>

            <Input
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="email@example.com"
              icon="mail"
              disabled={readOnly}
              readOnly={readOnly}
            />

            {isCreate ? (
              <Input
                label="Mật khẩu"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                icon="lock"
                showPasswordToggle
              />
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
                  Ngày sinh
                </label>
                <input
                  name="dob"
                  type="date"
                  value={form.dob}
                  onChange={handleChange}
                  disabled={readOnly}
                  readOnly={readOnly}
                  className="w-full rounded-lg border border-slate-200 dark:border-primary/20 bg-white dark:bg-slate-900/50 px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60"
                />
              </div>
              {readOnly ? (
                <Input
                  label="Giới tính"
                  name="genderView"
                  value={formatGenderLabel(form.gender)}
                  onChange={() => {}}
                  disabled
                  readOnly
                />
              ) : (
                <CustomSelect
                  label="Giới tính"
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  options={GENDER_OPTIONS}
                  icon="wc"
                />
              )}
            </div>

            {showBank ? (
              <>
                {readOnly ? (
                  <Input
                    label="Mã ngân hàng"
                    name="bankCodeView"
                    value={form.bankCode || '—'}
                    onChange={() => {}}
                    disabled
                    readOnly
                  />
                ) : (
                  <SearchableSelect
                    label="Ngân hàng"
                    name="bankCode"
                    value={form.bankCode}
                    onChange={handleChange}
                    icon="account_balance"
                    placeholder="Chọn ngân hàng"
                    searchPlaceholder="Tìm ngân hàng"
                    options={bankOptions}
                  />
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Số tài khoản"
                    name="accountNumber"
                    value={form.accountNumber}
                    onChange={handleChange}
                    placeholder="Số tài khoản"
                    icon="vignette"
                    disabled={readOnly}
                    readOnly={readOnly}
                  />
                  <Input
                    label="Tên chủ tài khoản"
                    name="accountName"
                    value={form.accountName}
                    onChange={handleChange}
                    placeholder="NGUYEN VAN A"
                    icon="badge"
                    disabled={readOnly}
                    readOnly={readOnly}
                  />
                </div>
              </>
            ) : null}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
                {readOnly ? 'Đóng' : 'Hủy'}
              </Button>
              {!readOnly ? (
                <Button type="submit" variant="primary" disabled={submitting || loadingDetail}>
                  {submitting ? 'Đang tạo...' : 'Tạo tài khoản'}
                </Button>
              ) : null}
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  )
}

export default UserModal
