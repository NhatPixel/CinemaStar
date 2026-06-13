import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import Button from '../Button'
import CustomSelect from '../CustomSelect'
import Icon from '../Icon'
import Input from '../Input'
import SearchableSelect from '../SearchableSelect'
import SearchableMultiSelect from '../SearchableMultiSelect'
import Text from '../Text'
import { useToast } from '../useToast'
import OpenStreetMapForm from '../openStreetMap/OpenStreetMapForm'
import {
  createCinema,
  getCinemaById,
  updateCinema,
} from '../../api/cinema'
import { searchManagers, searchStaffs } from '../../api/user'
import { usePagedUserOptions } from '../../hooks/usePagedUserOptions'
import { CINEMA_STATUS_LABEL_VI, CINEMA_STATUS_OPTIONS } from '../../constants/cinemaStatusOptions'

const EMPTY_FORM = {
  code: '',
  name: '',
  address: '',
  latitude: '',
  longitude: '',
  phone: '',
  openTime: '08:00',
  closeTime: '22:00',
  status: 'ACTIVE',
  managerId: '',
  staffIds: [],
}

function mapUserToOption(user) {
  if (!user?.id) return null
  return {
    value: user.id,
    label: user.email
      ? `${user.name || 'Chưa rõ tên'} — ${user.email}`
      : user.name || user.id,
  }
}

function mapStaffToOption(user) {
  if (!user?.id) return null
  const name = user.name || 'Chưa rõ tên'
  return {
    value: user.id,
    tagLabel: name,
    label: user.email ? `${name} — ${user.email}` : name,
  }
}

function normalizeStaffIds(value) {
  if (!Array.isArray(value)) return []
  return value.map(String).filter(Boolean)
}

function formToInitial(cinema) {
  if (!cinema) return { ...EMPTY_FORM }
  const lat = cinema.latitude
  const lng = cinema.longitude
  return {
    code: cinema.code || '',
    name: cinema.name || '',
    address: cinema.address || '',
    latitude: lat != null && lat !== '' ? String(lat) : '',
    longitude: lng != null && lng !== '' ? String(lng) : '',
    phone: cinema.phone || '',
    openTime: String(cinema.openTime || '08:00').slice(0, 5),
    closeTime: String(cinema.closeTime || '22:00').slice(0, 5),
    status: cinema.status || 'ACTIVE',
    managerId: cinema.managerId || '',
    staffIds: normalizeStaffIds(cinema.staffIds),
  }
}

function ensureTimeWithSeconds(value) {
  const v = String(value || '').trim()
  if (!v) return ''
  if (/^\d{2}:\d{2}:\d{2}$/.test(v)) return v
  if (/^\d{2}:\d{2}$/.test(v)) return `${v}:00`
  return v
}

function parseCoord(value) {
  const s = String(value ?? '')
    .trim()
    .replace(',', '.')
  if (!s) return NaN
  return Number(s)
}

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString('vi-VN')
}

/**
 * Modal tạo / chỉnh sửa / xem chi tiết rạp.
 * - `mode`: `create` | `edit` | `view`
 * - `cinemaId`: bắt buộc với `edit` và `view` — gọi GET `/cinemas/:id` khi mở.
 */
function CinemaModal({ isOpen, mode = 'create', cinemaId, onCancel, onSubmitted }) {
  const toast = useToast()
  const isCreate = mode === 'create'
  const isEdit = mode === 'edit'
  const isView = mode === 'view'
  const readOnly = isView

  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [submitting, setSubmitting] = useState(false)

  const userOptionsEnabled = isOpen && !isView
  const {
    options: managerOptionsBase,
    loading: managersLoading,
    loadingMore: managersLoadingMore,
    hasMore: managersHasMore,
    onSearchChange: onManagerSearchChange,
    onLoadMore: onManagerLoadMore,
    mergeOption: mergeManagerOption,
  } = usePagedUserOptions({
    enabled: userOptionsEnabled,
    searchFn: searchManagers,
    mapOption: mapUserToOption,
  })

  const {
    options: staffOptionsBase,
    loading: staffsLoading,
    loadingMore: staffsLoadingMore,
    hasMore: staffsHasMore,
    onSearchChange: onStaffSearchChange,
    onLoadMore: onStaffLoadMore,
    mergeOption: mergeStaffOption,
  } = usePagedUserOptions({
    enabled: isOpen,
    searchFn: searchStaffs,
    mapOption: mapStaffToOption,
  })

  useEffect(() => {
    if (!isOpen) return undefined
    if (isCreate) {
      setDetail(null)
      setForm({ ...EMPTY_FORM })
      setSubmitting(false)
      return undefined
    }
    if (!cinemaId) return undefined

    const controller = new AbortController()
    let cancelled = false
    setLoadingDetail(true)
  ;(async () => {
      try {
        const data = await getCinemaById(cinemaId, { signal: controller.signal })
        if (cancelled) return
        setDetail(data)
        setForm(formToInitial(data))
      } catch (e) {
        if (cancelled || e?.name === 'AbortError') return
        toast.error(e?.message || 'Không tải được thông tin rạp')
        onCancel?.()
      } finally {
        if (!cancelled) setLoadingDetail(false)
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [isOpen, isCreate, cinemaId, toast, onCancel])

  useEffect(() => {
    if (!isOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting && !loadingDetail) {
        onCancel?.()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, submitting, loadingDetail, onCancel])

  useEffect(() => {
    const managerId = String(form.managerId || detail?.managerId || '').trim()
    if (managerId) {
      mergeManagerOption(managerId, detail?.managerName)
    }
  }, [form.managerId, detail?.managerId, detail?.managerName, mergeManagerOption])

  useEffect(() => {
    if (!isOpen) return
    const ids = new Set([
      ...normalizeStaffIds(form.staffIds),
      ...normalizeStaffIds(detail?.staffIds),
    ])
    ids.forEach((staffId) => mergeStaffOption(staffId))
  }, [isOpen, form.staffIds, detail?.staffIds, mergeStaffOption])

  const managerOptions = managerOptionsBase

  const staffOptions = useMemo(() => {
    const managerId = String(form.managerId || '').trim()
    return staffOptionsBase.filter((opt) => !managerId || String(opt.value) !== managerId)
  }, [staffOptionsBase, form.managerId])

  useEffect(() => {
    if (!form.managerId) return
    setForm((prev) => {
      const nextStaffIds = normalizeStaffIds(prev.staffIds).filter(
        (id) => String(id) !== String(form.managerId),
      )
      if (nextStaffIds.length === normalizeStaffIds(prev.staffIds).length) return prev
      return { ...prev, staffIds: nextStaffIds }
    })
  }, [form.managerId])

  const viewStaffLabels = useMemo(
    () =>
      normalizeStaffIds(detail?.staffIds)
        .map(
          (staffId) =>
            staffOptions.find((opt) => String(opt.value) === staffId)?.tagLabel ||
            staffOptions.find((opt) => String(opt.value) === staffId)?.label ||
            staffId,
        )
        .filter(Boolean),
    [detail?.staffIds, staffOptions],
  )

  const handleChange = (e) => {
    if (readOnly) return
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleStaffChange = (e) => {
    if (readOnly) return
    setForm((prev) => ({
      ...prev,
      staffIds: normalizeStaffIds(e.target.value),
    }))
  }

  const handleMapChange = (lat, lng) => {
    if (readOnly) return
    setForm((prev) => ({
      ...prev,
      latitude: Number(lat).toFixed(6),
      longitude: Number(lng).toFixed(6),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (readOnly || submitting || loadingDetail) return

    const code = form.code.trim()
    const name = form.name.trim()
    const address = form.address.trim()
    const phone = form.phone.trim()
    const latitude = parseCoord(form.latitude)
    const longitude = parseCoord(form.longitude)

    if (isCreate && !code) return toast.error('Vui lòng nhập mã rạp')
    if (!name) return toast.error('Vui lòng nhập tên rạp')
    if (!address) return toast.error('Vui lòng nhập địa chỉ')
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return toast.error('Vui lòng nhập đúng vĩ độ và kinh độ')
    }
    if (latitude < -90 || latitude > 90) {
      return toast.error('Vĩ độ phải trong khoảng -90 đến 90')
    }
    if (longitude < -180 || longitude > 180) {
      return toast.error('Kinh độ phải trong khoảng -180 đến 180')
    }
    if (!form.openTime || !form.closeTime) {
      return toast.error('Vui lòng nhập giờ mở và đóng cửa')
    }

    const managerId = String(form.managerId || '').trim() || null

    const basePayload = {
      name,
      address,
      latitude,
      longitude,
      phone,
      openTime: ensureTimeWithSeconds(form.openTime),
      closeTime: ensureTimeWithSeconds(form.closeTime),
      managerId,
      staffIds: normalizeStaffIds(form.staffIds),
    }

    try {
      setSubmitting(true)
      let data
      if (isEdit) {
        data = await updateCinema(cinemaId, basePayload)
        toast.success(
          typeof data?.message === 'string'
            ? data.message
            : 'Cập nhật rạp thành công',
        )
      } else {
        data = await createCinema({
          ...basePayload,
          code,
          status: form.status,
        })
        toast.success(
          typeof data?.message === 'string' ? data.message : 'Tạo rạp thành công',
        )
      }
      onSubmitted?.(data, { isEdit })
    } catch (err) {
      toast.error(
        err?.message || (isEdit ? 'Không thể cập nhật rạp' : 'Không thể tạo rạp'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const title = isView ? 'Chi tiết rạp' : isEdit ? 'Chỉnh sửa rạp' : 'Tạo rạp mới'
  const subtitle = isView
    ? 'Thông tin chi tiết rạp từ hệ thống.'
      : isEdit
      ? 'Cập nhật thông tin rạp, quản lý phụ trách, nhân viên hoặc vị trí trên bản đồ.'
      : 'Nhập thông tin rạp, quản lý phụ trách, nhân viên và vị trí trên bản đồ.'

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={`Đóng modal ${title.toLowerCase()}`}
        className="absolute inset-0 bg-black/60"
        onClick={() => {
          if (!submitting && !loadingDetail) onCancel?.()
        }}
      />
      <div className="relative z-[101] w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl dark:border-primary/20 dark:bg-background-dark">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <Text variant="h2" className="text-2xl font-bold text-slate-900 dark:text-white">
              {title}
            </Text>
            <Text variant="small" className="text-sm text-slate-500 dark:text-slate-400">
              {subtitle}
            </Text>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            disabled={submitting}
            onClick={onCancel}
          >
            <Icon name="close" />
          </Button>
        </div>

        {loadingDetail ? (
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
            Đang tải thông tin rạp...
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Mã rạp"
                name="code"
                value={form.code}
                onChange={handleChange}
                placeholder="VD: CIN-HCM-01"
                icon="qr_code_2"
                disabled={!isCreate}
                readOnly={!isCreate}
              />
              <Input
                label="Tên rạp"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="CinemaStar ..."
                icon="theaters"
                disabled={readOnly}
                readOnly={readOnly}
              />
            </div>

            <Input
              label="Địa chỉ"
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Số nhà, đường, quận / huyện, tỉnh / thành"
              icon="location_on"
              disabled={readOnly}
              readOnly={readOnly}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Số điện thoại"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="0912xxxxxx"
                icon="call"
                disabled={readOnly}
                readOnly={readOnly}
              />
              {isCreate ? (
                <CustomSelect
                  label="Trạng thái"
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  options={CINEMA_STATUS_OPTIONS}
                  placeholder="Chọn trạng thái"
                  icon="toggle_on"
                />
              ) : (
                <Input
                  label="Trạng thái"
                  name="status"
                  value={CINEMA_STATUS_LABEL_VI[form.status] || form.status || '—'}
                  onChange={() => {}}
                  icon="toggle_on"
                  disabled
                  readOnly
                />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Giờ mở cửa"
                name="openTime"
                type="time"
                value={form.openTime}
                onChange={handleChange}
                disabled={readOnly}
                readOnly={readOnly}
              />
              <Input
                label="Giờ đóng cửa"
                name="closeTime"
                type="time"
                value={form.closeTime}
                onChange={handleChange}
                disabled={readOnly}
                readOnly={readOnly}
              />
            </div>

            {isView ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Quản lý phụ trách"
                  name="managerName"
                  value={detail?.managerName || '—'}
                  onChange={() => {}}
                  icon="badge"
                  disabled
                  readOnly
                />
                <Input
                  label="Nhân viên"
                  name="staffNames"
                  value={viewStaffLabels.length ? viewStaffLabels.join(', ') : '—'}
                  onChange={() => {}}
                  icon="groups"
                  disabled
                  readOnly
                />
                <Input
                  label="Ngày tạo"
                  name="createdAt"
                  value={formatDateTime(detail?.createdAt)}
                  onChange={() => {}}
                  icon="event"
                  disabled
                  readOnly
                />
                <Input
                  label="Cập nhật lần cuối"
                  name="updatedAt"
                  value={formatDateTime(detail?.updatedAt)}
                  onChange={() => {}}
                  icon="update"
                  disabled
                  readOnly
                />
              </div>
            ) : null}

            <div className="rounded-xl border border-slate-200 dark:border-primary/20 p-4">
              <div className="mb-3">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Vị trí trên bản đồ
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {isView
                    ? 'Vị trí rạp trên OpenStreetMap.'
                    : 'Nhập trực tiếp toạ độ, hoặc tìm địa chỉ, kéo / nhấp vào bản đồ.'}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <Input
                  label="Vĩ độ"
                  name="latitude"
                  value={form.latitude}
                  onChange={handleChange}
                  placeholder="VD: 10.776889"
                  icon="north"
                  inputMode="decimal"
                  disabled={readOnly}
                  readOnly={readOnly}
                />
                <Input
                  label="Kinh độ"
                  name="longitude"
                  value={form.longitude}
                  onChange={handleChange}
                  placeholder="VD: 106.700806"
                  icon="east"
                  inputMode="decimal"
                  disabled={readOnly}
                  readOnly={readOnly}
                />
              </div>
              <OpenStreetMapForm
                mode={readOnly ? 'view' : 'picker'}
                lat={form.latitude}
                lng={form.longitude}
                onChange={handleMapChange}
              />
            </div>

            {!isView ? (
              <>
                <SearchableSelect
                  label="Quản lý phụ trách"
                  name="managerId"
                  value={form.managerId}
                  onChange={handleChange}
                  options={managerOptions}
                  placeholder={
                    managersLoading ? 'Đang tải danh sách...' : 'Chọn quản lý phụ trách'
                  }
                  searchPlaceholder="Tìm theo tên hoặc email..."
                  icon="badge"
                  serverSearch
                  onSearchChange={onManagerSearchChange}
                  onLoadMore={onManagerLoadMore}
                  hasMore={managersHasMore}
                  loading={managersLoading}
                  loadingMore={managersLoadingMore}
                />
                <SearchableMultiSelect
                  label="Nhân viên"
                  name="staffIds"
                  values={form.staffIds}
                  onChange={handleStaffChange}
                  options={staffOptions}
                  placeholder={
                    staffsLoading ? 'Đang tải danh sách...' : 'Chọn nhân viên phụ trách rạp'
                  }
                  searchPlaceholder="Tìm theo tên hoặc email..."
                  icon="groups"
                  serverSearch
                  onSearchChange={onStaffSearchChange}
                  onLoadMore={onStaffLoadMore}
                  hasMore={staffsHasMore}
                  loading={staffsLoading}
                  loadingMore={staffsLoadingMore}
                />
              </>
            ) : null}

            <div className="pt-2 flex justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                size="md"
                className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-100 dark:border-primary/30 dark:text-slate-200 dark:hover:bg-primary/10"
                disabled={submitting}
                onClick={onCancel}
              >
                {isView ? 'Đóng' : 'Hủy'}
              </Button>
              {!isView ? (
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="rounded-lg px-4 py-2"
                  disabled={submitting || loadingDetail}
                >
                  {submitting
                    ? 'Đang lưu...'
                    : isEdit
                      ? 'Lưu thay đổi'
                      : 'Tạo rạp'}
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

export default CinemaModal
