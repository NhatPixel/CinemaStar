import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Button from '../Button'
import CustomSelect from '../CustomSelect'
import Icon from '../Icon'
import Input from '../Input'
import Text from '../Text'
import { useToast } from '../useToast'
import {
  buildPricingPolicyWritePayload,
  createPricingPolicy,
  getPricingPolicyById,
  updatePricingPolicy,
  validatePricingOrder,
} from '../../api/pricingPolicy'
import { formatCurrency } from '../../pages/booking/bookingData'

const EMPTY_FORM = {
  cinemaId: '',
  name: '',
  standardPrice: '',
  vipPrice: '',
  couplePrice: '',
}

function policyToForm(policy) {
  if (!policy) return { ...EMPTY_FORM }
  return {
    cinemaId: policy.cinemaId || '',
    name: policy.name || '',
    standardPrice: policy.standardPrice != null ? String(policy.standardPrice) : '',
    vipPrice: policy.vipPrice != null ? String(policy.vipPrice) : '',
    couplePrice: policy.couplePrice != null ? String(policy.couplePrice) : '',
  }
}

function defaultCinemaId(cinemaOptions) {
  if (!Array.isArray(cinemaOptions) || cinemaOptions.length !== 1) return ''
  return cinemaOptions[0]?.value || ''
}

function PricingPolicyModal({
  isOpen,
  mode = 'create',
  policyId,
  cinemaOptions = [],
  cinemaNameById = {},
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

  useEffect(() => {
    if (!isOpen) return undefined
    if (isCreate) {
      setDetail(null)
      setForm({ ...EMPTY_FORM, cinemaId: defaultCinemaId(cinemaOptions) })
      setSubmitting(false)
      return undefined
    }
    if (!policyId) return undefined

    const controller = new AbortController()
    let cancelled = false
    setLoadingDetail(true)

    ;(async () => {
      try {
        const data = await getPricingPolicyById(policyId, { signal: controller.signal })
        if (cancelled) return
        setDetail(data)
        setForm(policyToForm(data))
      } catch (e) {
        if (cancelled || e?.name === 'AbortError') return
        toast.error(e?.message || 'Không tải được chính sách giá')
        onCancel?.()
      } finally {
        if (!cancelled) setLoadingDetail(false)
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [isOpen, isCreate, policyId, cinemaOptions, toast, onCancel])

  const handleChange = (e) => {
    if (readOnly) return
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (readOnly || submitting || loadingDetail) return

    const name = form.name.trim()
    if (!name) return toast.error('Vui lòng nhập tên chính sách')
    if (!form.cinemaId) return toast.error('Vui lòng chọn rạp')

    const orderError = validatePricingOrder(
      form.standardPrice,
      form.vipPrice,
      form.couplePrice,
    )
    if (orderError) return toast.error(orderError)

    const payload = buildPricingPolicyWritePayload({
      cinemaId: form.cinemaId,
      name,
      standardPrice: form.standardPrice,
      vipPrice: form.vipPrice,
      couplePrice: form.couplePrice,
    })

    try {
      setSubmitting(true)
      let data
      if (isEdit) {
        data = await updatePricingPolicy(policyId, payload)
        toast.success(data?.message || 'Cập nhật chính sách giá thành công')
      } else {
        data = await createPricingPolicy(payload)
        toast.success(data?.message || 'Tạo chính sách giá thành công')
      }
      onSubmitted?.(data, { isEdit })
    } catch (err) {
      toast.error(
        err?.message ||
          (isEdit ? 'Cập nhật chính sách giá thất bại' : 'Tạo chính sách giá thất bại'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const cinemaLabel =
    cinemaNameById[form.cinemaId] ||
    cinemaOptions.find((o) => o.value === form.cinemaId)?.label ||
    form.cinemaId ||
    '—'

  const title = isView
    ? 'Chi tiết chính sách giá'
    : isEdit
      ? 'Chỉnh sửa chính sách giá'
      : 'Tạo chính sách giá'

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Đóng"
        className="absolute inset-0 bg-black/60"
        onClick={() => {
          if (!submitting && !loadingDetail) onCancel?.()
        }}
      />
      <div className="relative z-[101] w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl dark:border-primary/20 dark:bg-background-dark">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <Text variant="h2" className="text-2xl font-bold text-slate-900 dark:text-white">
              {title}
            </Text>
            {!readOnly ? (
              <Text variant="small" className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Giá ghế: Standard &lt; VIP &lt; Couple
              </Text>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="p-2 rounded-lg"
            disabled={submitting}
            onClick={onCancel}
          >
            <Icon name="close" />
          </Button>
        </div>

        {loadingDetail ? (
          <p className="text-sm text-slate-500 mb-4">Đang tải...</p>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            {readOnly ? (
              <Input
                label="Rạp"
                name="cinemaView"
                value={cinemaLabel}
                onChange={() => {}}
                icon="festival"
                disabled
                readOnly
              />
            ) : (
              <CustomSelect
                label="Rạp"
                name="cinemaId"
                value={form.cinemaId}
                onChange={handleChange}
                options={
                  cinemaOptions.length > 0
                    ? cinemaOptions
                    : [{ value: '', label: 'Chưa có rạp được gán' }]
                }
                disabled={cinemaOptions.length === 0 || isEdit}
                placeholder="Chọn rạp"
              />
            )}

            <Input
              label="Tên chính sách"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="VD: Giá cuối tuần"
              icon="sell"
              disabled={readOnly}
              readOnly={readOnly}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Ghế Standard"
                name="standardPrice"
                type={readOnly ? 'text' : 'number'}
                min={readOnly ? undefined : '0'}
                step={readOnly ? undefined : '1000'}
                value={
                  readOnly ? formatCurrency(Number(form.standardPrice || 0)) : form.standardPrice
                }
                onChange={handleChange}
                icon="event_seat"
                disabled={readOnly}
                readOnly={readOnly}
              />
              <Input
                label="Ghế VIP"
                name="vipPrice"
                type={readOnly ? 'text' : 'number'}
                min={readOnly ? undefined : '0'}
                step={readOnly ? undefined : '1000'}
                value={readOnly ? formatCurrency(Number(form.vipPrice || 0)) : form.vipPrice}
                onChange={handleChange}
                icon="star"
                disabled={readOnly}
                readOnly={readOnly}
              />
              <Input
                label="Ghế Couple"
                name="couplePrice"
                type={readOnly ? 'text' : 'number'}
                min={readOnly ? undefined : '0'}
                step={readOnly ? undefined : '1000'}
                value={
                  readOnly ? formatCurrency(Number(form.couplePrice || 0)) : form.couplePrice
                }
                onChange={handleChange}
                icon="favorite"
                disabled={readOnly}
                readOnly={readOnly}
              />
            </div>

            {isEdit ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Chỉ sửa/xóa khi chính sách chưa gắn suất chiếu nào.
              </p>
            ) : null}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
                {readOnly ? 'Đóng' : 'Hủy'}
              </Button>
              {!readOnly ? (
                <Button type="submit" variant="primary" disabled={submitting || loadingDetail}>
                  {submitting ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo chính sách'}
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

export default PricingPolicyModal
