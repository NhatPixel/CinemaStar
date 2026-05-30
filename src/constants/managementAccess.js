import { readCurrentUserRole } from './userRoleLabels'

/** Trang vận hành rạp (phòng, suất, giá, đặt vé, sản phẩm) — cùng API manager. */
export const MANAGEMENT_OPERATION_ROLES = ['ADMIN', 'MANAGER', 'STAFF']

/** Trang quản lý rạp — admin sửa, manager chỉ xem. */
export const CINEMA_MANAGEMENT_ROLES = ['ADMIN', 'MANAGER']

export function isManagementStaffReadOnly(role) {
  return String(role || '').trim().toUpperCase() === 'STAFF'
}

export function isCinemaManagementReadOnly(role) {
  return String(role || '').trim().toUpperCase() === 'MANAGER'
}

export function canWriteCinemaManagement(role) {
  return String(role || '').trim().toUpperCase() === 'ADMIN'
}

export function canWriteManagementOperations(role) {
  const r = String(role || '').trim().toUpperCase()
  return r === 'ADMIN' || r === 'MANAGER'
}

export function isManagementOperationsReadOnly() {
  return isManagementStaffReadOnly(readCurrentUserRole())
}

export function isCinemaManagementReadOnlyFromStorage() {
  return isCinemaManagementReadOnly(readCurrentUserRole())
}
