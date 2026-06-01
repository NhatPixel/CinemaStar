/** Chọn API POST /bookings/me/active/search | .../me/history/search */
export const CUSTOMER_BOOKING_LIST_OPTIONS = [
  { value: 'active', label: 'Đang xử lý' },
  { value: 'history', label: 'Đã thanh toán' },
]

export const CUSTOMER_BOOKING_LIST_META = {
  active: {
    title: 'Đang xử lý',
    description: 'Các đơn đang giữ ghế hoặc chờ thanh toán.',
    empty: 'Không có đơn đang xử lý.',
  },
  history: {
    title: 'Đã thanh toán',
    description: 'Các đơn đặt vé đã thanh toán thành công.',
    empty: 'Chưa có vé đã thanh toán.',
  },
}
