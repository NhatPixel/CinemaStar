import { useState } from 'react'
import Icon from '../Icon'

function defaultIconForType(type) {
  if (type === 'DRINK') return 'local_cafe'
  if (type === 'FOOD') return 'fastfood'
  return 'local_movies'
}

/**
 * Ảnh sản phẩm; lỗi tải hoặc không có URL thì hiện icon.
 */
function ProductThumbnail({
  imageUrl,
  alt = '',
  type,
  fallbackIcon,
  className = '',
  iconClassName = 'text-3xl',
}) {
  const [failed, setFailed] = useState(false)
  const url = String(imageUrl || '').trim()
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
