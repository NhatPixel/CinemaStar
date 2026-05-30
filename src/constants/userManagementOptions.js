import { USER_ROLE_LABEL_VI } from './userRoleLabels'

/** Vai trò đối tượng quản lý (không gồm ADMIN). */
export const MANAGED_USER_ROLES = {
  MANAGER: 'MANAGER',
  STAFF: 'STAFF',
  CUSTOMER: 'CUSTOMER',
}

/** Filter "Vai trò" theo quyền người đăng nhập. */
export function getManagedRoleFilterOptions(viewerRole) {
  const role = String(viewerRole || '').trim().toUpperCase()
  if (role === 'ADMIN') {
    return [
      { value: MANAGED_USER_ROLES.MANAGER, label: USER_ROLE_LABEL_VI.MANAGER },
      { value: MANAGED_USER_ROLES.STAFF, label: USER_ROLE_LABEL_VI.STAFF },
      { value: MANAGED_USER_ROLES.CUSTOMER, label: USER_ROLE_LABEL_VI.CUSTOMER },
    ]
  }
  if (role === 'MANAGER') {
    return [
      { value: MANAGED_USER_ROLES.STAFF, label: USER_ROLE_LABEL_VI.STAFF },
      { value: MANAGED_USER_ROLES.CUSTOMER, label: USER_ROLE_LABEL_VI.CUSTOMER },
    ]
  }
  if (role === 'STAFF') {
    return [{ value: MANAGED_USER_ROLES.CUSTOMER, label: USER_ROLE_LABEL_VI.CUSTOMER }]
  }
  return []
}

/** Staff chỉ xem khách — không hiện dropdown đổi vai trò. */
export function shouldShowManagedRoleFilter(viewerRole) {
  return String(viewerRole || '').trim().toUpperCase() !== 'STAFF'
}

export function getDefaultManagedRole(viewerRole) {
  const role = String(viewerRole || '').trim().toUpperCase()
  if (role === 'STAFF') return MANAGED_USER_ROLES.CUSTOMER
  const options = getManagedRoleFilterOptions(viewerRole)
  return options[0]?.value || MANAGED_USER_ROLES.STAFF
}

export function canCreateManagedUser(viewerRole, managedRole) {
  const viewer = String(viewerRole || '').trim().toUpperCase()
  const target = String(managedRole || '').trim().toUpperCase()
  if (target === MANAGED_USER_ROLES.CUSTOMER) return false
  if (viewer === 'ADMIN' && target === MANAGED_USER_ROLES.MANAGER) return true
  if (
    target === MANAGED_USER_ROLES.STAFF &&
    (viewer === 'ADMIN' || viewer === 'MANAGER')
  ) {
    return true
  }
  return false
}

export function needsBankFieldsForRole(managedRole) {
  const r = String(managedRole || '').trim().toUpperCase()
  return r === MANAGED_USER_ROLES.MANAGER || r === MANAGED_USER_ROLES.STAFF
}

/** Quyền sửa/xóa đối tượng trong trang quản lý (BE kiểm tra chi tiết thêm). */
export function canWriteManagedUser(viewerRole, managedRole) {
  const viewer = String(viewerRole || '').trim().toUpperCase()
  const target = String(managedRole || '').trim().toUpperCase()
  if (target === MANAGED_USER_ROLES.MANAGER) return viewer === 'ADMIN'
  if (target === MANAGED_USER_ROLES.STAFF) {
    return viewer === 'ADMIN' || viewer === 'MANAGER'
  }
  if (target === MANAGED_USER_ROLES.CUSTOMER) {
    return viewer === 'ADMIN' || viewer === 'MANAGER' || viewer === 'STAFF'
  }
  return false
}
