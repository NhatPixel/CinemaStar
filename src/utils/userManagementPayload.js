import { Gender } from '../constants/genderMeta'
import { needsBankFieldsForRole } from '../constants/userManagementOptions'

/** Khớp BE Register* / Update* request validation */
export const MANAGED_USER_PHONE_PATTERN = /^(0\d{9}|\+84\d{9})$/

export const MANAGED_USER_PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/

export function normalizeManagedPhone(phone) {
  const raw = String(phone || '').trim().replace(/\s/g, '')
  if (!raw) return ''
  if (raw.startsWith('+84')) return raw
  if (raw.startsWith('84') && raw.length === 11) return `+${raw}`
  if (raw.startsWith('0')) return raw
  return raw
}

export function validateManagedUserForm(form, { isCreate = false, showBank = false } = {}) {
  const name = String(form?.name || '').trim()
  if (!name) return 'Vui lòng nhập họ tên'

  const email = String(form?.email || '').trim()
  if (!email) return 'Vui lòng nhập email'

  const phone = normalizeManagedPhone(form?.phone)
  if (!phone) return 'Vui lòng nhập số điện thoại'
  if (!MANAGED_USER_PHONE_PATTERN.test(phone)) {
    return 'Số điện thoại phải là 10 số (bắt đầu 0) hoặc +84 và 9 số tiếp theo'
  }

  if (!form?.dob) return 'Vui lòng chọn ngày sinh'

  const gender = String(form?.gender || '').trim().toUpperCase()
  if (![Gender.MALE, Gender.FEMALE, Gender.OTHER].includes(gender)) {
    return 'Giới tính không hợp lệ'
  }

  const password = String(form?.password || '').trim()
  if (isCreate && !password) {
    return 'Vui lòng nhập mật khẩu'
  }
  if (isCreate || password) {
    if (password.length < 8 || password.length > 32) {
      return 'Mật khẩu phải từ 8 đến 32 ký tự'
    }
    if (!MANAGED_USER_PASSWORD_PATTERN.test(password)) {
      return 'Mật khẩu cần chữ hoa, chữ thường, số và ký tự đặc biệt (@$!%*?&)'
    }
  }

  if (showBank) {
    const bankCode = String(form?.bankCode || '').trim()
    const accountNumber = String(form?.accountNumber || '').trim()
    const accountName = String(form?.accountName || '').trim()
    if (bankCode && bankCode.length > 50) return 'Mã ngân hàng tối đa 50 ký tự'
    if (accountNumber && accountNumber.length > 50) return 'Số tài khoản tối đa 50 ký tự'
    if (accountName && accountName.length > 200) return 'Tên chủ tài khoản tối đa 200 ký tự'
  }

  return null
}

function pickBankFields(form, managedRole) {
  if (!needsBankFieldsForRole(managedRole)) return {}
  const bankCode = String(form.bankCode || '').trim()
  const accountNumber = String(form.accountNumber || '').trim()
  const accountName = String(form.accountName || '').trim()
  return {
    ...(bankCode ? { bankCode } : {}),
    ...(accountNumber ? { accountNumber } : {}),
    ...(accountName ? { accountName } : {}),
  }
}

/** POST /auth/manager | /auth/staff */
export function buildManagedRegisterPayload(form, managedRole) {
  return {
    name: String(form.name).trim(),
    email: String(form.email).trim(),
    password: String(form.password || '').trim(),
    dob: form.dob,
    gender: String(form.gender).trim().toUpperCase(),
    phone: normalizeManagedPhone(form.phone),
    ...pickBankFields(form, managedRole),
  }
}

/** PUT /users/{customers|staffs|managers}/{id} — chỉ gửi newPassword khi admin nhập đổi mật khẩu */
export function buildManagedUpdatePayload(form, managedRole) {
  const payload = {
    name: String(form.name).trim(),
    email: String(form.email).trim(),
    dob: form.dob,
    gender: String(form.gender).trim().toUpperCase(),
    phone: normalizeManagedPhone(form.phone),
    ...pickBankFields(form, managedRole),
  }
  const newPassword = String(form.password || '').trim()
  if (newPassword) {
    payload.newPassword = newPassword
  }
  return payload
}
