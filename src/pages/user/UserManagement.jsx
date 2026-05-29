import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  CustomSelect,
  Icon,
  Input,
  Text,
  UserModal,
  useToast,
} from '../../components'
import { buildUsersSearchBody, searchManagedUsers } from '../../api/user'
import { formatGenderLabel } from '../../constants/genderMeta'
import { USER_ROLE_LABEL_VI, readCurrentUserRole } from '../../constants/userRoleLabels'
import {
  MANAGED_USER_ROLES,
  canCreateManagedUser,
  getDefaultManagedRole,
  getManagedRoleFilterOptions,
  needsBankFieldsForRole,
} from '../../constants/userManagementOptions'

const PAGE_SIZE = 12

function formatDate(value) {
  if (value == null || value === '') return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('vi-VN')
}

function formatDateTime(value) {
  if (value == null || value === '') return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getTableColumns(managedRole) {
  const base = [
    { key: 'name', label: 'Họ tên' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'SĐT' },
    { key: 'gender', label: 'Giới tính' },
    { key: 'dob', label: 'Ngày sinh' },
  ]
  if (needsBankFieldsForRole(managedRole)) {
    base.push(
      { key: 'bankCode', label: 'Ngân hàng' },
      { key: 'accountNumber', label: 'Số TK' },
    )
  }
  base.push({ key: 'timeCreated', label: 'Ngày tạo' })
  return base
}

function renderCell(user, columnKey) {
  switch (columnKey) {
    case 'name':
      return user.name || '—'
    case 'email':
      return user.email || '—'
    case 'phone':
      return user.phone || '—'
    case 'gender':
      return formatGenderLabel(user.gender)
    case 'dob':
      return formatDate(user.dob)
    case 'bankCode':
      return user.bankCode || '—'
    case 'accountNumber':
      return user.accountNumber || '—'
    case 'timeCreated':
      return formatDateTime(user.timeCreated)
    default:
      return '—'
  }
}

function UserManagement() {
  const toast = useToast()
  const viewerRole = readCurrentUserRole()
  const roleFilterOptions = useMemo(
    () => getManagedRoleFilterOptions(viewerRole),
    [viewerRole],
  )

  const [managedRole, setManagedRole] = useState(() => getDefaultManagedRole(viewerRole))
  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  const [rows, setRows] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrevious, setHasPrevious] = useState(false)
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [viewingUserId, setViewingUserId] = useState(null)
  const [refreshTick, setRefreshTick] = useState(0)

  const columns = useMemo(() => getTableColumns(managedRole), [managedRole])
  const canCreate = canCreateManagedUser(viewerRole, managedRole)
  const managedRoleLabel = USER_ROLE_LABEL_VI[managedRole] || managedRole

  useEffect(() => {
    const allowed = roleFilterOptions.map((o) => o.value)
    if (!allowed.includes(managedRole) && allowed.length > 0) {
      setManagedRole(allowed[0])
    }
  }, [roleFilterOptions, managedRole])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedKeyword(keyword.trim()), 400)
    return () => clearTimeout(t)
  }, [keyword])

  useEffect(() => {
    setPage(1)
  }, [debouncedKeyword, managedRole])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const ac = new AbortController()

    const body = buildUsersSearchBody({
      page,
      size: PAGE_SIZE,
      keyword: debouncedKeyword,
    })

    ;(async () => {
      try {
        const data = await searchManagedUsers(managedRole, body, { signal: ac.signal })
        if (cancelled) return
        setRows(data?.data || [])
        setTotalPages(data?.totalPages ?? 0)
        setTotalElements(data?.totalElements ?? 0)
        setHasNext(Boolean(data?.hasNext))
        setHasPrevious(Boolean(data?.hasPrevious))
      } catch (e) {
        if (cancelled || e?.name === 'AbortError') return
        toast.error(e?.message || 'Không tải được danh sách người dùng')
        setRows([])
        setTotalPages(0)
        setTotalElements(0)
        setHasNext(false)
        setHasPrevious(false)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      ac.abort()
    }
  }, [page, debouncedKeyword, managedRole, refreshTick, toast])

  const displayRows = useMemo(() => {
    const q = debouncedKeyword.toLowerCase()
    if (!q) return rows
    return rows.filter((user) => {
      const text = `${user.name || ''} ${user.email || ''} ${user.phone || ''}`.toLowerCase()
      return text.includes(q)
    })
  }, [rows, debouncedKeyword])

  const colSpan = columns.length + 1

  if (roleFilterOptions.length === 0) {
    return (
      <main className="flex-1 min-w-0 p-6 md:p-8">
        <Text variant="h1" className="text-3xl font-bold">
          Quản lý người dùng
        </Text>
        <p className="mt-4 text-slate-500">Bạn không có quyền truy cập trang này.</p>
      </main>
    )
  }

  return (
    <>
      <main className="flex-1 min-w-0 p-6 md:p-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <Text variant="h1" className="text-3xl font-bold dark:text-slate-100">
              Quản lý người dùng
            </Text>
            <Text variant="small" className="text-slate-500 dark:text-slate-400 mt-1">
              Danh sách {managedRoleLabel.toLowerCase()} — chọn vai trò để đổi bảng và thao tác
            </Text>
          </div>
          {canCreate ? (
            <Button
              type="button"
              variant="primary"
              className="px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/30"
              onClick={() => setCreateOpen(true)}
            >
              <Icon name="person_add" />
              Thêm {managedRoleLabel.toLowerCase()}
            </Button>
          ) : null}
        </header>

        <section className="bg-white dark:bg-primary/5 p-6 rounded-2xl border border-slate-200 dark:border-primary/20 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              name="userSearch"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm theo tên, email, số điện thoại..."
              icon="search"
            />
            <CustomSelect
              name="managedRoleFilter"
              value={managedRole}
              onChange={(e) => setManagedRole(e.target.value)}
              options={roleFilterOptions}
            />
          </div>
        </section>

        <div className="bg-white dark:bg-primary/5 rounded-2xl border border-slate-200 dark:border-primary/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-background-dark/30 border-b border-slate-200 dark:border-primary/20">
                  {columns.map((col) => (
                    <th key={col.key} className="px-6 py-4 font-semibold text-sm whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                  <th className="px-6 py-4 font-semibold text-sm text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-primary/10">
                {loading ? (
                  <tr>
                    <td colSpan={colSpan} className="px-6 py-8 text-center text-slate-500">
                      Đang tải danh sách...
                    </td>
                  </tr>
                ) : null}
                {!loading && displayRows.length === 0 ? (
                  <tr>
                    <td colSpan={colSpan} className="px-6 py-8 text-center text-slate-500">
                      Không có {managedRoleLabel.toLowerCase()} phù hợp.
                    </td>
                  </tr>
                ) : null}
                {!loading
                  ? displayRows.map((user) => (
                      <tr
                        key={user.id}
                        className="cursor-pointer hover:bg-slate-50/50 dark:hover:bg-primary/5 transition-colors"
                        onClick={() => setViewingUserId(user.id)}
                      >
                        {columns.map((col) => (
                          <td
                            key={col.key}
                            className={`px-6 py-4 ${
                              col.key === 'name' ? 'font-semibold' : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {renderCell(user, col.key)}
                          </td>
                        ))}
                        <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-2 text-primary hover:bg-primary/10 rounded-lg"
                            title="Xem chi tiết"
                            onClick={() => setViewingUserId(user.id)}
                          >
                            <Icon name="visibility" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 bg-slate-50 dark:bg-background-dark/30 border-t border-slate-200 dark:border-primary/20 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {!loading && displayRows.length > 0 && (
              <Text variant="small" className="text-sm text-slate-500 dark:text-slate-400">
                {totalElements > 0
                  ? `Hiển thị ${displayRows.length} / ${totalElements} người dùng`
                  : `Đang hiển thị ${displayRows.length} người dùng`}
              </Text>
            )}
            {!loading && totalPages > 1 && (
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={!hasPrevious || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Trang trước
                </Button>
                <Text variant="small" className="text-sm text-slate-500">
                  Trang {page}
                  {totalPages > 0 ? ` / ${totalPages}` : ''}
                </Text>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={!hasNext || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Trang sau
                </Button>
              </div>
            )}
          </div>
        </div>

        <UserModal
          isOpen={createOpen}
          mode="create"
          managedRole={managedRole}
          onCancel={() => setCreateOpen(false)}
          onSubmitted={() => {
            setCreateOpen(false)
            setRefreshTick((n) => n + 1)
          }}
        />

        <UserModal
          isOpen={Boolean(viewingUserId)}
          mode="view"
          managedRole={managedRole}
          userId={viewingUserId}
          onCancel={() => setViewingUserId(null)}
        />
      </main>
    </>
  )
}

export default UserManagement
