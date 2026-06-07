import { useState } from 'react'
import { resolveProductImageUrl } from '../../constants/productImages'
import Icon from '../Icon'

function defaultIconForType(type) {
  if (type === 'DRINK') return 'local_cafe'
  if (type === 'SNACK' || type === 'FOOD') return 'fastfood'
  if (type === 'POPCORN') return 'local_movies'
  if (type === 'COMBO') return 'fastfood'
  return 'local_movies'
}

/**
 * Ảnh sản phẩm; lỗi tải hoặc không có URL thì hiện icon.
 */
function ProductThumbnail({
  imageUrl,
  alt = '',
  type,
  name,
  fallbackIcon,
  className = '',
  iconClassName = 'text-3xl',
}) {
  const [failed, setFailed] = useState(false)
  const url = resolveProductImageUrl({ imageUrl, type, name })
  const icon = fallbackIcon || defaultIconForType(type)

  if (url && !failed) {
    return (
      <img
        src={url}
        alt={alt}
        className={className}
        onError={() => setFailed(true)}
      />
    )
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Icon name={icon} className={iconClassName} />
    </div>
  )
}

export default ProductThumbnail
