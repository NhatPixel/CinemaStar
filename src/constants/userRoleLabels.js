/** Khớp backend: UserRole { ADMIN, MANAGER, STAFF, CUSTOMER } */
export const USER_ROLE_LABEL_VI = {
  ADMIN: 'Quản trị viên',
  MANAGER: 'Quản lý rạp',
  STAFF: 'Nhân viên',
  CUSTOMER: 'Thành viên',
}

/**
 * @param {string} [role] — ADMIN | MANAGER | STAFF | CUSTOMER (hoặc USER cũ → coi như CUSTOMER)
 * @returns {string}
 */
export function formatRoleLabel(role) {
  if (role == null || role === '') return '—'
  let key = String(role).trim().toUpperCase()
  if (key === 'USER') key = 'CUSTOMER'
  return USER_ROLE_LABEL_VI[key] || String(role).trim() || '—'
}
