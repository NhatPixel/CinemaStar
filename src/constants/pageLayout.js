/** Vỏ trang giống `MovieList` (/movies) — nền theme, chữ, chiều cao tối thiểu */
export const PAGE_SHELL =
  'bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen'

/** Khối main chính (đệm ngang/dọc thống nhất) */
export const PAGE_MAIN =
  'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'

/** Full viewport: sidebar trái + main (một hàng), không footer phía dưới */
export const PAGE_SHELL_SIDEBAR =
  'bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex'

/** Một hàng sidebar + main — cao theo nội dung (`items-start` tránh kéo giãn `main` tạo khoảng trống trên footer) */
export const PAGE_SIDEBAR_ROW =
  'flex items-start min-w-0 bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100'

/**
 * Layout quản trị: cột sidebar + main rồi footer — cuộn trang bình thường, footer ở cuối nội dung
 * (không ghim footer mép dưới viewport như shell `100dvh` + `overflow-hidden`).
 */
export const PAGE_SHELL_STACK =
  'bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 flex min-h-screen flex-col'
