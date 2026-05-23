import { Navigate } from 'react-router-dom'
import { readCurrentUserRole } from '../../constants/userRoleLabels'

/**
 * Chỉ render children khi role hiện tại nằm trong allowedRoles.
 * @param {{ allowedRoles: string[], children: import('react').ReactNode, fallback?: string }} props
 */
function RequireRole({ allowedRoles, children, fallback = '/' }) {
  const role = readCurrentUserRole()
  const allowed = allowedRoles.map((r) => String(r).trim().toUpperCase())
  if (!role || !allowed.includes(role)) {
    return <Navigate to={fallback} replace />
  }
  return children
}

export default RequireRole
