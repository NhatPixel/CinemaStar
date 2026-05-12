import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import Button from '../Button'
import CustomSelect from '../CustomSelect'
import Icon from '../Icon'
import Input from '../Input'
import SearchableSelect from '../SearchableSelect'
import Text from '../Text'
import { useToast } from '../useToast'
import OpenStreetMapPickerForm from '../openStreetMap/OpenStreetMapPickerForm'
import { createCinema, updateCinema } from '../../api/cinema'
import { searchManagers } from '../../api/user'
import { CINEMA_STATUS_OPTIONS } from '../../constants/cinemaStatusOptions'

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
}

const MAX_MANAGER_PAGES = 50

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
  }
}

function ensureTimeWithSeconds(value) {
  const v = String(value || '').trim()
  if (!v) return ''
  if (/^\d{2}:\d{2}:\d{2}$/.test(v)) return v
  if (/^\d{2}:\d{2}$/.test(v)) return `${v}:00`
  return v
}

/** Chuỗi người dùng nhập (cho phép dấu phẩy làm thập phân) → số */
function parseCoord(value) {
  const s = String(value ?? '')
    .trim()
    .replace(',', '.')
  if (!s) return NaN
  return Number(s)
}

/**
 * From dùng cho cả tạo mới và chỉnh sửa rạp.
 * - Truyền `cinema` (object có `id`) → chế độ edit (ẩn `code` & `status`).
 * - Bỏ trống `cinema` → chế độ create.
 * - `onSubmitted(data, { isEdit })` fire sau khi lưu thành công.
 */
function CinemaUpsertModal({ isOpen, cinema, onCancel, onSubmitted }) {
  const toast = useToast()
  const isEdit = Boolean(cinema?.id)
  const [form, setForm] = useState(() => formToInitial(cinema))
  const [submitting, setSubmitting] = useState(false)
  const [managers, setManagers] = useState([])
  const [managersLoading, setManagersLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setForm(formToInitial(cinema))
      setSubmitting(false)
    }
  }, [isOpen, cinema])

  useEffect(() => {
    if (!isOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting) {
        onCancel?.()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, submitting, onCancel])

  useEffect(() => {
    if (!isOpen) return undefined
    const controller = new AbortController()
    let cancelled = false
    setManagersLoading(true)
    ;(async () => {
      try {
        const all = []
        const size = 100
        for (let page = 1; page <= MAX_MANAGER_PAGES; page += 1) {
          const res = await searchManagers(
            { page, size, keyword: '' },
            { signal: controller.signal },
          )
          const list = Array.isArray(res?.data) ? res.data : []
          all.push(...list)
          if (!res?.hasNext) break
        }
        if (!cancelled) setManagers(all)
      } catch (e) {
        if (!cancelled && !controller.signal.aborted) {
          toast.error(e?.message || 'Không tải được danh sách manager')
        }
      } finally {
        if (!cancelled) setManagersLoading(false)
      }
    })()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [isOpen, toast])

  const managerOptions = useMemo(
    () =>
      managers.map((m) => ({
        value: m.id,
        label: m.email
          ? `${m.name || 'Chưa rõ tên'} — ${m.email}`
          : m.name || m.id,
      })),
    [managers],
  )

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleMapChange = (lat, lng) => {
    setForm((prev) => ({
      ...prev,
      latitude: Number(lat).toFixed(6),
      longitude: Number(lng).toFixed(6),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return

    const code = form.code.trim()
    const name = form.name.trim()
    const address = form.address.trim()
    const phone = form.phone.trim()
    const latitude = parseCoord(form.latitude)
    const longitude = parseCoord(form.longitude)

    if (!isEdit && !code) return toast.error('Vui lòng nhập mã rạp')
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
    if (!form.managerId) return toast.error('Vui lòng chọn quản lý phụ trách')

    const basePayload = {
      name,
      address,
      latitude,
      longitude,
      phone,
      openTime: ensureTimeWithSeconds(form.openTime),
      closeTime: ensureTimeWithSeconds(form.closeTime),
      managerId: form.managerId,
    }

    try {
      setSubmitting(true)
      let data
      if (isEdit) {
        data = await updateCinema(cinema.id, basePayload)
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

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={isEdit ? 'Đóng modal chỉnh sửa rạp' : 'Đóng modal tạo rạp'}
        className="absolute inset-0 bg-black/60"
        onClick={() => {
          if (!submitting) onCancel?.()
        }}
      />
      <div className="relative z-[101] w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl dark:border-primary/20 dark:bg-background-dark">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <Text variant="h2" className="text-2xl font-bold text-slate-900 dark:text-white">
              {isEdit ? 'Chỉnh sửa rạp' : 'Tạo rạp mới'}
            </Text>
            <Text variant="small" className="text-sm text-slate-500 dark:text-slate-400">
              {isEdit
                ? 'Cập nhật thông tin rạp, quản lý phụ trách hoặc vị trí trên bản đồ.'
                : 'Nhập thông tin rạp, chọn quản lý phụ trách và vị trí trên bản đồ.'}
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

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isEdit ? (
              <Input
                label="Mã rạp"
                name="code"
                value={form.code}
                onChange={() => {}}
                placeholder="VD: CIN-HCM-01"
                icon="qr_code_2"
                disabled
                readOnly
              />
            ) : (
              <Input
                label="Mã rạp"
                name="code"
                value={form.code}
                onChange={handleChange}
                placeholder="VD: CIN-HCM-01"
                icon="qr_code_2"
              />
            )}
            <Input
              label="Tên rạp"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="CinemaStar ..."
              icon="theaters"
            />
          </div>

          <Input
            label="Địa chỉ"
            name="address"
            value={form.address}
            onChange={handleChange}
            placeholder="Số nhà, đường, quận / huyện, tỉnh / thành"
            icon="location_on"
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
            />
            {isEdit ? null : (
              <CustomSelect
                label="Trạng thái"
                name="status"
                value={form.status}
                onChange={handleChange}
                options={CINEMA_STATUS_OPTIONS}
                placeholder="Chọn trạng thái"
                icon="toggle_on"
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
            />
            <Input
              label="Giờ đóng cửa"
              name="closeTime"
              type="time"
              value={form.closeTime}
              onChange={handleChange}
            />
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-primary/20 p-4">
            <div className="mb-3">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Vị trí trên bản đồ
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Nhập trực tiếp toạ độ, hoặc tìm địa chỉ, kéo / nhấp vào bản đồ.
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
              />
              <Input
                label="Kinh độ"
                name="longitude"
                value={form.longitude}
                onChange={handleChange}
                placeholder="VD: 106.700806"
                icon="east"
                inputMode="decimal"
              />
            </div>
            <OpenStreetMapPickerForm
              lat={form.latitude}
              lng={form.longitude}
              onChange={handleMapChange}
            />
          </div>

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
          />

          <div className="pt-2 flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              size="md"
              className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-100 dark:border-primary/30 dark:text-slate-200 dark:hover:bg-primary/10"
              disabled={submitting}
              onClick={onCancel}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="rounded-lg px-4 py-2"
              disabled={submitting}
            >
              {submitting
                ? 'Đang lưu...'
                : isEdit
                  ? 'Lưu thay đổi'
                  : 'Tạo rạp'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}

export default CinemaUpsertModal
