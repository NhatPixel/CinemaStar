import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  ConfirmModal,
  CustomSelect,
  Icon,
  Input,
  PagePagination,
  Text,
  UserModal,
  USER_MODAL_MODES,
  useToast,
} from '../../components'
import { buildUsersSearchBody, deleteManagedUser, searchManagedUsers } from '../../api/user'
import { formatGenderLabel } from '../../constants/genderMeta'
import { USER_ROLE_LABEL_VI, readCurrentUserRole } from '../../constants/userRoleLabels'
import {
  MANAGED_USER_ROLES,
  canCreateManagedUser,
  canWriteManagedUser,
  getDefaultManagedRole,
  getManagedRoleFilterOptions,
  needsBankFieldsForRole,
  shouldShowManagedRoleFilter,
} from '../../constants/userManagementOptions'

const PAGE_SIZE = 12

const CLOSED_MODAL = { open: false, mode: USER_MODAL_MODES.CREATE, userId: null }

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
  const [userModal, setUserModal] = useState(CLOSED_MODAL)
  const [pendingDeleteUser, setPendingDeleteUser] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [refreshTick, setRefreshTick] = useState(0)

  const columns = useMemo(() => getTableColumns(managedRole), [managedRole])
  const canCreate = canCreateManagedUser(viewerRole, managedRole)
  const canWrite = canWriteManagedUser(viewerRole, managedRole)
  const showActions = canWrite
  const showRoleFilter = shouldShowManagedRoleFilter(viewerRole)
  const managedRoleLabel = USER_ROLE_LABEL_VI[managedRole] || managedRole

  const openUserModal = (mode, userId = null) => {
    setUserModal({ open: true, mode, userId })
  }

  const closeUserModal = () => {
    setUserModal(CLOSED_MODAL)
  }

  const handleModalSubmitted = () => {
    closeUserModal()
    setRefreshTick((n) => n + 1)
  }

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

  const handleDeleteUser = async () => {
    if (!pendingDeleteUser?.id || deletingId) return
    try {
      setDeletingId(pendingDeleteUser.id)
      const data = await deleteManagedUser(managedRole, pendingDeleteUser.id)
      toast.success(data?.message || `Đã xóa ${managedRoleLabel.toLowerCase()}`)
      setPendingDeleteUser(null)
      setRefreshTick((n) => n + 1)
    } catch (e) {
      toast.error(e?.message || 'Không thể xóa người dùng')
    } finally {
      setDeletingId(null)
    }
  }

  const colSpan = columns.length + (showActions ? 1 : 0)

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
              {showRoleFilter
                ? `Danh sách ${managedRoleLabel.toLowerCase()} — chọn vai trò để đổi bảng và thao tác`
                : `Danh sách ${managedRoleLabel.toLowerCase()}`}
            </Text>
          </div>
          {canCreate ? (
            <Button
              type="button"
              variant="primary"
              className="px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/30"
              onClick={() => openUserModal(USER_MODAL_MODES.CREATE)}
            >
              <Icon name="person_add" />
              Thêm {managedRoleLabel.toLowerCase()}
            </Button>
          ) : null}
        </header>

        <section className="bg-white dark:bg-primary/5 p-6 rounded-2xl border border-slate-200 dark:border-primary/20 mb-8">
          <div
            className={
              showRoleFilter ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'grid grid-cols-1 gap-4'
            }
          >
            <Input
              name="userSearch"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm theo tên, email, số điện thoại..."
              icon="search"
            />
            {showRoleFilter ? (
              <CustomSelect
                name="managedRoleFilter"
                value={managedRole}
                onChange={(e) => setManagedRole(e.target.value)}
                options={roleFilterOptions}
              />
            ) : null}
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
                  {showActions ? (
                    <th className="px-6 py-4 font-semibold text-sm text-center">Hành động</th>
                  ) : null}
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
                {!loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={colSpan} className="px-6 py-8 text-center text-slate-500">
                      Không có {managedRoleLabel.toLowerCase()} phù hợp.
                    </td>
                  </tr>
                ) : null}
                {!loading
                  ? rows.map((user) => (
                      <tr key={user.id}>
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
                        {showActions ? (
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg"
                                title="Chỉnh sửa"
                                onClick={() => openUserModal(USER_MODAL_MODES.EDIT, user.id)}
                              >
                                <Icon name="edit" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"
                                title="Xóa"
                                onClick={() => setPendingDeleteUser(user)}
                                disabled={deletingId === user.id}
                              >
                                <Icon name="delete" />
                              </Button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 bg-slate-50 dark:bg-background-dark/30 border-t border-slate-200 dark:border-primary/20 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {!loading && rows.length > 0 && (
              <Text variant="small" className="text-sm text-slate-500 dark:text-slate-400">
                {totalElements > 0
                  ? `Hiển thị ${rows.length} / ${totalElements} người dùng`
                  : `Đang hiển thị ${rows.length} người dùng`}
              </Text>
            )}
            <PagePagination
              page={page}
              totalPages={totalPages}
              hasNext={hasNext}
              hasPrevious={hasPrevious}
              loading={loading}
              onPageChange={setPage}
              className="self-end sm:self-auto"
            />
          </div>
        </div>

        <UserModal
          isOpen={userModal.open}
          mode={userModal.mode}
          managedRole={managedRole}
          userId={userModal.userId}
          onCancel={closeUserModal}
          onSubmitted={handleModalSubmitted}
        />
      </main>

      <ConfirmModal
        isOpen={Boolean(pendingDeleteUser)}
        title={`Xác nhận xóa ${managedRoleLabel.toLowerCase()}`}
        message={`Bạn có chắc chắn muốn xóa "${pendingDeleteUser?.name || pendingDeleteUser?.email || ''}"? Hành động này sẽ vô hiệu hóa tài khoản.`}
        onConfirm={handleDeleteUser}
        onCancel={() => setPendingDeleteUser(null)}
        disableConfirm={deletingId === pendingDeleteUser?.id}
        closeOnOverlayClick={deletingId !== pendingDeleteUser?.id}
      />
    </>
  )
}

export default UserManagement
