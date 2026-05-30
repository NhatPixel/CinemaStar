export const MOVIE_STATUS_OPTIONS = [
  { value: 'COMING_SOON', label: 'Sắp chiếu' },
  { value: 'NOW_SHOWING', label: 'Đang chiếu' },
  { value: 'ENDED', label: 'Ngừng chiếu' },
  { value: 'ARCHIVED', label: 'Lưu trữ' },
]

/** Trang danh sách phim công khai (/movies). */
export const MOVIE_LIST_STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'NOW_SHOWING', label: 'Đang chiếu' },
  { value: 'COMING_SOON', label: 'Sắp chiếu' },
]

export const MOVIE_LIST_PUBLIC_STATUSES = ['NOW_SHOWING', 'COMING_SOON']
