import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Button from '../Button'
import CustomSelect from '../CustomSelect'
import Icon from '../Icon'
import Input from '../Input'
import Text from '../Text'
import { useToast } from '../useToast'
import { createProduct, getProductById, updateProduct } from '../../api/product'
import {
  PRODUCT_STATUS_OPTIONS,
  PRODUCT_TYPE_OPTIONS,
} from '../../constants/productOptions'

const EMPTY_FORM = {
  cinemaId: '',
  name: '',
  type: 'COMBO',
  price: '',
  description: '',
  imageUrl: '',
  status: 'ACTIVE',
}

function productToForm(product) {
  if (!product) return { ...EMPTY_FORM }
  return {
    cinemaId: product.cinemaId || '',
    name: product.name || '',
    type: product.type || 'COMBO',
    price: product.price != null ? String(product.price) : '',
    description: product.description || '',
    imageUrl: product.imageUrl || '',
    status: product.status || 'ACTIVE',
  }
}

function defaultCinemaId(cinemaOptions) {
  if (!Array.isArray(cinemaOptions) || cinemaOptions.length !== 1) return ''
  return cinemaOptions[0]?.value || ''
}

function ProductModal({
  isOpen,
  mode = 'create',
  productId,
  cinemaOptions = [],
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
  const [imagePreviewError, setImagePreviewError] = useState(false)

  const imagePreviewUrl = form.imageUrl?.trim() || ''

  useEffect(() => {
    if (!isOpen) return undefined
    if (isCreate) {
      setDetail(null)
      setForm({ ...EMPTY_FORM, cinemaId: defaultCinemaId(cinemaOptions) })
      setSubmitting(false)
      return undefined
    }
    if (!productId) return undefined

    const controller = new AbortController()
    let cancelled = false
    setLoadingDetail(true)

    ;(async () => {
      try {
        const data = await getProductById(productId, { signal: controller.signal })
        if (cancelled) return
        setDetail(data)
        setForm(productToForm(data))
      } catch (e) {
        if (cancelled || e?.name === 'AbortError') return
        toast.error(e?.message || 'Không tải được thông tin sản phẩm')
        onCancel?.()
      } finally {
        if (!cancelled) setLoadingDetail(false)
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [isOpen, isCreate, productId, cinemaOptions, toast, onCancel])

  useEffect(() => {
    if (!isOpen || !isCreate || readOnly) return
    const fallbackId = defaultCinemaId(cinemaOptions)
    if (!fallbackId) return
    setForm((prev) => (prev.cinemaId ? prev : { ...prev, cinemaId: fallbackId }))
  }, [isOpen, isCreate, readOnly, cinemaOptions])

  useEffect(() => {
    setImagePreviewError(false)
  }, [imagePreviewUrl])

  const handleChange = (e) => {
    if (readOnly) return
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (readOnly || submitting || loadingDetail) return

    const name = form.name.trim()
    if (!name) return toast.error('Vui lòng nhập tên sản phẩm')
    if (!form.cinemaId) return toast.error('Vui lòng chọn rạp')

    const priceRaw = String(form.price).trim()
    if (!priceRaw) return toast.error('Vui lòng nhập giá')
    const price = Number(priceRaw)
    if (!Number.isFinite(price)) return toast.error('Giá không hợp lệ')

    const payload = {
      cinemaId: form.cinemaId,
      name,
      type: form.type,
      price,
      description: form.description?.trim() || '',
      imageUrl: form.imageUrl?.trim() || '',
      status: form.status,
    }

    try {
      setSubmitting(true)
      let data
      if (isEdit) {
        data = await updateProduct(productId, payload)
        toast.success(
          typeof data?.message === 'string' ? data.message : 'Cập nhật sản phẩm thành công',
        )
      } else {
        data = await createProduct(payload)
        toast.success(
          typeof data?.message === 'string' ? data.message : 'Tạo sản phẩm thành công',
        )
      }
      onSubmitted?.(data, { isEdit })
    } catch (err) {
      toast.error(
        err?.message ||
          (isEdit ? 'Cập nhật sản phẩm thất bại' : 'Tạo sản phẩm thất bại'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const cinemaLabel =
    cinemaOptions.find((o) => o.value === (detail?.cinemaId || form.cinemaId))?.label ||
    detail?.cinemaId ||
    form.cinemaId ||
    '—'

  const title = isView
    ? 'Chi tiết sản phẩm'
    : isEdit
      ? 'Chỉnh sửa sản phẩm'
      : 'Tạo sản phẩm mới'

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Đóng modal sản phẩm"
        className="absolute inset-0 bg-black/60"
        onClick={() => {
          if (!submitting && !loadingDetail) onCancel?.()
        }}
      />
      <div className="relative z-[101] w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl dark:border-primary/20 dark:bg-background-dark">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <Text variant="h2" className="text-2xl font-bold text-slate-900 dark:text-white">
              {title}
            </Text>
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
          <p className="text-sm text-slate-500 mb-4">Đang tải thông tin sản phẩm...</p>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            {readOnly ? (
              <Input label="Rạp" name="cinemaView" value={cinemaLabel} onChange={() => {}} disabled readOnly />
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
              label="Tên sản phẩm"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Combo bắp nước"
              icon="fastfood"
              disabled={readOnly}
              readOnly={readOnly}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CustomSelect
                label="Loại"
                name="type"
                value={form.type}
                onChange={handleChange}
                options={PRODUCT_TYPE_OPTIONS}
                disabled={readOnly}
              />
              <CustomSelect
                label="Trạng thái"
                name="status"
                value={form.status}
                onChange={handleChange}
                options={PRODUCT_STATUS_OPTIONS}
                disabled={readOnly}
              />
            </div>

            <Input
              label="Giá (VNĐ)"
              name="price"
              type={readOnly ? 'text' : 'number'}
              value={form.price}
              onChange={handleChange}
              placeholder="99000"
              icon="payments"
              disabled={readOnly}
              readOnly={readOnly}
            />

            <Input
              label="Ảnh (URL)"
              name="imageUrl"
              value={form.imageUrl}
              onChange={handleChange}
              placeholder="https://..."
              icon="image"
              disabled={readOnly}
              readOnly={readOnly}
            />

            {imagePreviewUrl ? (
              <div className="rounded-xl border border-slate-200 dark:border-primary/20 bg-slate-50 dark:bg-slate-900/40 p-3">
                {!imagePreviewError ? (
                  <img
                    src={imagePreviewUrl}
                    alt={form.name?.trim() || 'Xem trước ảnh sản phẩm'}
                    className="mx-auto max-h-52 w-full rounded-lg object-contain"
                    onLoad={() => setImagePreviewError(false)}
                    onError={() => setImagePreviewError(true)}
                  />
                ) : (
                  <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-6">
                    Không tải được ảnh từ URL này
                  </p>
                )}
              </div>
            ) : null}

            {readOnly ? (
              <Input
                label="Mô tả"
                name="descriptionView"
                value={form.description || '—'}
                onChange={() => {}}
                disabled
                readOnly
              />
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
                  Mô tả
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 dark:border-primary/20 bg-white dark:bg-slate-900/50 px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Mô tả ngắn về sản phẩm"
                />
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
                {readOnly ? 'Đóng' : 'Hủy'}
              </Button>
              {!readOnly ? (
                <Button type="submit" variant="primary" disabled={submitting || loadingDetail}>
                  {submitting ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
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

export default ProductModal
