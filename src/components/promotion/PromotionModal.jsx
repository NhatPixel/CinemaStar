import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  buildPromotionWritePayload,
  createPromotion,
  getPromotionById,
  updatePromotion,
  validatePromotionForm,
} from '../../api/promotion'
import { getFilmById } from '../../api/film'
import { formatCurrency } from '../../pages/booking/bookingData'
import {
  PROMOTION_DISCOUNT_TYPE_OPTIONS,
  PROMOTION_STATUS_OPTIONS,
} from '../../constants/promotionOptions'
import Button from '../Button'
import CustomSelect from '../CustomSelect'
import Icon from '../Icon'
import Input from '../Input'
import SearchableMultiSelect from '../SearchableMultiSelect'
import Text from '../Text'
import TextArea from '../TextArea'
import { useToast } from '../useToast'

const EMPTY_FORM = {
  code: '',
  name: '',
  description: '',
  discountType: 'PERCENT',
  discountValue: '',
  minOrderAmount: '',
  maxDiscountAmount: '',
  startAt: '',
  endAt: '',
  status: 'ACTIVE',
  cinemaIds: [],
  filmIds: [],
}

function toDateInputValue(value) {
  if (!value) return ''
  const raw = String(value)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) return raw.slice(0, 16)
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return ''
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function defaultCinemaIds(cinemaOptions) {
  if (!Array.isArray(cinemaOptions) || cinemaOptions.length !== 1) return []
  const id = cinemaOptions[0]?.value
  return id ? [id] : []
}

function promotionToForm(promotion) {
  if (!promotion) return { ...EMPTY_FORM }
  return {
    code: promotion.code || '',
    name: promotion.name || '',
    description: promotion.description || '',
    discountType: promotion.discountType || 'PERCENT',
    discountValue: promotion.discountValue != null ? String(promotion.discountValue) : '',
    minOrderAmount: promotion.minOrderAmount != null ? String(promotion.minOrderAmount) : '',
    maxDiscountAmount:
      promotion.maxDiscountAmount != null ? String(promotion.maxDiscountAmount) : '',
    startAt: toDateInputValue(promotion.startAt),
    endAt: toDateInputValue(promotion.endAt),
    status: promotion.status || 'ACTIVE',
    cinemaIds: Array.isArray(promotion.cinemaIds) ? promotion.cinemaIds.map(String) : [],
    filmIds: Array.isArray(promotion.filmIds) ? promotion.filmIds.map(String) : [],
  }
}

function PromotionModal({
  isOpen,
  mode = 'create',
  promotionId,
  cinemaOptions = [],
  filmOptions = [],
  cinemaNameById = {},
  filmNameById = {},
  onCancel,
  onSubmitted,
}) {
  const toast = useToast()
  const isCreate = mode === 'create'
  const isEdit = mode === 'edit'
  const isView = mode === 'view'
  const readOnly = isView

  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [submitting, setSubmitting] = useState(false)
  const [extraFilmOptions, setExtraFilmOptions] = useState([])

  const cinemaMultiOptions = useMemo(
    () =>
      cinemaOptions.map((opt) => ({
        value: opt.value,
        label: opt.label,
        tagLabel: opt.label,
      })),
    [cinemaOptions],
  )

  const filmMultiOptions = useMemo(() => {
    const merged = [...filmOptions]
    for (const extra of extraFilmOptions) {
      if (!merged.some((opt) => String(opt.value) === String(extra.value))) {
        merged.push(extra)
      }
    }
    return merged.map((opt) => ({
      value: opt.value,
      label: opt.label,
      tagLabel: opt.label,
    }))
  }, [filmOptions, extraFilmOptions])

  useEffect(() => {
    if (!isOpen) {
      setExtraFilmOptions([])
      return undefined
    }
    const ids = (form.filmIds || []).map(String).filter(Boolean)
    const missing = ids.filter((id) => !filmOptions.some((opt) => String(opt.value) === id))
    if (!missing.length) return undefined

    let cancelled = false
    ;(async () => {
      const extras = await Promise.all(
        missing.map(async (id) => {
          try {
            const film = await getFilmById(id)
            const label = film?.title || film?.name || id
            return { value: id, label }
          } catch {
            return { value: id, label: id }
          }
        }),
      )
      if (!cancelled) {
        setExtraFilmOptions((prev) => {
          const next = [...prev]
          for (const extra of extras) {
            if (!next.some((opt) => String(opt.value) === String(extra.value))) {
              next.push(extra)
            }
          }
          return next
        })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isOpen, form.filmIds, filmOptions])

  useEffect(() => {
    if (!isOpen) return undefined
    if (isCreate) {
      setDetail(null)
      setForm({
        ...EMPTY_FORM,
        cinemaIds: defaultCinemaIds(cinemaOptions),
      })
      setSubmitting(false)
      return undefined
    }
    if (!promotionId) return undefined

    const controller = new AbortController()
    let cancelled = false
    setLoadingDetail(true)

    ;(async () => {
      try {
        const data = await getPromotionById(promotionId, { signal: controller.signal })
        if (cancelled) return
        setDetail(data)
        setForm(promotionToForm(data))
      } catch (e) {
        if (cancelled || e?.name === 'AbortError') return
        toast.error(e?.message || 'Không tải được mã giảm giá')
        onCancel?.()
      } finally {
        if (!cancelled) setLoadingDetail(false)
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [isOpen, isCreate, promotionId, cinemaOptions, toast, onCancel])

  const handleChange = (e) => {
    if (readOnly) return
    const { name, value } = e.target
    setForm((prev) => {
      const next = { ...prev, [name]: value }
      if (name === 'discountType' && value !== 'PERCENT') {
        next.maxDiscountAmount = ''
      }
      return next
    })
  }

  const handleMultiChange = (e) => {
    if (readOnly) return
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: Array.isArray(value) ? value : [] }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (readOnly) return
    const err = validatePromotionForm(form)
    if (err) {
      toast.error(err)
      return
    }

    const payload = buildPromotionWritePayload(form, { forCreate: isCreate })
    setSubmitting(true)
    try {
      if (isCreate) {
        const created = await createPromotion(payload)
        toast.success(created?.message || 'Tạo mã giảm giá thành công')
      } else {
        const updated = await updatePromotion(promotionId, payload)
        toast.success(updated?.message || 'Cập nhật mã giảm giá thành công')
      }
      onSubmitted?.(isCreate ? 'create' : 'edit')
    } catch (ex) {
      toast.error(ex?.message || 'Lưu mã giảm giá thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  const title = isCreate ? 'Tạo mã giảm giá' : isEdit ? 'Sửa mã giảm giá' : 'Chi tiết mã giảm giá'

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-primary/30 dark:bg-[#120a1a]"
        role="dialog"
        aria-modal="true"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-primary/20 dark:bg-[#120a1a]">
          <Text variant="h2" className="text-xl font-bold dark:text-white">
            {title}
          </Text>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-primary/10"
          >
            <Icon name="close" />
          </button>
        </div>

        {loadingDetail ? (
          <div className="p-8 text-center text-slate-500">Đang tải...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Mã khuyến mãi"
                name="code"
                value={form.code}
                onChange={handleChange}
                placeholder="CINEMASTAR10"
                disabled={readOnly || isEdit}
                icon="sell"
              />
              <Input
                label="Tên chương trình"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Giảm 10% cuối tuần"
                disabled={readOnly}
                icon="local_offer"
              />
            </div>

            <TextArea
              label="Mô tả"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Mô tả cho mã giảm giá"
              disabled={readOnly}
              rows={2}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <CustomSelect
                label="Loại giảm"
                name="discountType"
                value={form.discountType}
                onChange={handleChange}
                options={PROMOTION_DISCOUNT_TYPE_OPTIONS}
                disabled={readOnly}
              />
              <Input
                label={form.discountType === 'PERCENT' ? 'Giá trị (%)' : 'Giá trị (VNĐ)'}
                name="discountValue"
                type="number"
                min="0"
                step={form.discountType === 'PERCENT' ? '1' : '1000'}
                value={form.discountValue}
                onChange={handleChange}
                disabled={readOnly}
              />
            </div>

            <div
              className={`grid gap-4 ${
                form.discountType === 'PERCENT' ? 'sm:grid-cols-2' : 'grid-cols-1'
              }`}
            >
              <Input
                label="Đơn tối thiểu (VNĐ)"
                name="minOrderAmount"
                type="number"
                min="0"
                value={form.minOrderAmount}
                onChange={handleChange}
                disabled={readOnly}
                placeholder="Không bắt buộc"
              />
              {form.discountType === 'PERCENT' ? (
                <Input
                  label="Giảm tối đa (VNĐ)"
                  name="maxDiscountAmount"
                  type="number"
                  min="0"
                  value={form.maxDiscountAmount}
                  onChange={handleChange}
                  disabled={readOnly}
                  placeholder="Không bắt buộc"
                />
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Bắt đầu"
                name="startAt"
                type="datetime-local"
                value={form.startAt}
                onChange={handleChange}
                disabled={readOnly}
              />
              <Input
                label="Kết thúc"
                name="endAt"
                type="datetime-local"
                value={form.endAt}
                onChange={handleChange}
                disabled={readOnly}
              />
            </div>

            {!isCreate ? (
              <CustomSelect
                label="Trạng thái"
                name="status"
                value={form.status}
                onChange={handleChange}
                options={PROMOTION_STATUS_OPTIONS}
                disabled={readOnly}
              />
            ) : null}

            <SearchableMultiSelect
              label="Rạp áp dụng"
              name="cinemaIds"
              values={form.cinemaIds}
              onChange={handleMultiChange}
              options={cinemaMultiOptions}
              placeholder="Chọn rạp"
              disabled={readOnly || cinemaMultiOptions.length === 0}
            />

            <SearchableMultiSelect
              label="Phim áp dụng (để trống = tất cả phim)"
              name="filmIds"
              values={form.filmIds}
              onChange={handleMultiChange}
              options={filmMultiOptions}
              placeholder="Chọn phim"
              disabled={readOnly}
            />

            {isView && detail ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-primary/20 dark:bg-white/5">
                <p className="text-slate-600 dark:text-slate-300">
                  Đang hiệu lực:{' '}
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {detail.activeNow ? 'Có' : 'Không'}
                  </span>
                </p>
                <p className="mt-2 text-slate-500">
                  Rạp:{' '}
                  {(detail.cinemaIds || [])
                    .map((id) => cinemaNameById[id] || id)
                    .join(', ') || '—'}
                </p>
                <p className="mt-1 text-slate-500">
                  Phim:{' '}
                  {(detail.filmIds || []).length > 0
                    ? detail.filmIds.map((id) => filmNameById[id] || id).join(', ')
                    : 'Tất cả phim'}
                </p>
                {detail.minOrderAmount != null ? (
                  <p className="mt-1 text-slate-500">
                    Đơn tối thiểu: {formatCurrency(detail.minOrderAmount)}
                  </p>
                ) : null}
                {detail.discountType === 'PERCENT' && detail.maxDiscountAmount != null ? (
                  <p className="mt-1 text-slate-500">
                    Giảm tối đa: {formatCurrency(detail.maxDiscountAmount)}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end dark:border-primary/20">
              <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
                {readOnly ? 'Đóng' : 'Hủy'}
              </Button>
              {!readOnly ? (
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Đang lưu...' : isCreate ? 'Tạo mã' : 'Lưu thay đổi'}
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

export default PromotionModal
