/** Khớp backend: UserRole { ADMIN, MANAGER, STAFF, CUSTOMER } */
export const USER_ROLE_LABEL_VI = {
  ADMIN: 'Quản trị viên',
  MANAGER: 'Quản lý',
  STAFF: 'Nhân viên',
  CUSTOMER: 'Khách hàng',
}

/**
 * @param {string} [role] — ADMIN | MANAGER | STAFF | CUSTOMER (hoặc USER cũ → coi như CUSTOMER)
 * @returns {string}
 */
/** Role đăng nhập từ localStorage (`currentUser.role`). */
export function readCurrentUserRole() {
  try {
    const raw = localStorage.getItem('currentUser')
    if (!raw) return ''
    const user = JSON.parse(raw)
    return String(user?.role || '').trim().toUpperCase()
  } catch {
    return ''
  }
}

export function formatRoleLabel(role) {
  if (role == null || role === '') return '—'
  let key = String(role).trim().toUpperCase()
  if (key === 'USER') key = 'CUSTOMER'
  return USER_ROLE_LABEL_VI[key] || String(role).trim() || '—'
}
